"""Main review orchestrator — parse → detect type → split → parallel analyze → aggregate."""

import asyncio
import json
import logging
import re

from fastapi import UploadFile

from models.review import ClauseAnalysis, ContractReview, RiskLevel, RiskSummary
from prompts.clause_analysis_prompt import CLAUSE_ANALYSIS_SYSTEM, build_clause_analysis_prompt
from services.contract_type_detector import detect_contract_type
from services.embedder import EmbeddingService
from services.llm_service import llm_service
from services.parser import parse_file
from services.qdrant_service import QdrantService

logger = logging.getLogger(__name__)

MAX_CONCURRENT = 5  # max parallel LLM calls per review request
MIN_CLAUSE_LEN = 80  # minimum chars to consider a clause worth analyzing

# Vietnamese contract structure markers
_CLAUSE_PATTERN = re.compile(
    r"(?=(?:Điều|ĐIỀU|Mục|MỤC|Khoản|KHOẢN)\s+\d+[\.\s])",
    re.UNICODE,
)


def split_contract_clauses(text: str) -> list[dict]:
    """Split contract text into clauses by Vietnamese structure markers.

    Returns list of {"clause_id": str, "text": str}.
    Falls back to paragraph splitting if no structure found.
    """
    parts = _CLAUSE_PATTERN.split(text)
    parts = [p.strip() for p in parts if p.strip() and len(p.strip()) >= MIN_CLAUSE_LEN]

    if len(parts) >= 2:
        clauses = []
        for i, part in enumerate(parts):
            # Extract clause ID from first line
            first_line = part.split("\n")[0].strip()
            clause_id = first_line[:60] if first_line else f"Khoản {i + 1}"
            clauses.append({"clause_id": clause_id, "text": part})
        return clauses

    # Fallback: split by double newlines (paragraphs)
    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) >= MIN_CLAUSE_LEN]
    return [{"clause_id": f"Đoạn {i + 1}", "text": p} for i, p in enumerate(paragraphs)]


def _parse_clause_analysis(raw: str, clause_index: int, clause_text: str) -> ClauseAnalysis:
    """Parse LLM JSON response into ClauseAnalysis. Falls back to low-risk on error."""
    try:
        # Extract JSON block if wrapped in markdown
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(json_match.group() if json_match else raw)
        return ClauseAnalysis(
            clause_index=clause_index,
            clause_text=clause_text[:500],
            risk_level=RiskLevel(data.get("risk_level", "low")),
            issues=data.get("issues", []),
            legal_references=data.get("legal_references", []),
            suggestion=data.get("suggestion"),
            suggested_text=data.get("suggested_text"),
            compliant=data.get("compliant", True),
        )
    except Exception as exc:
        logger.warning("Failed to parse clause analysis JSON (clause %d): %s", clause_index, exc)
        return ClauseAnalysis(
            clause_index=clause_index,
            clause_text=clause_text[:500],
            risk_level=RiskLevel.LOW,
            issues=["Không thể phân tích điều khoản này."],
            legal_references=[],
            suggestion=None,
            suggested_text=None,
            compliant=True,
        )


async def _analyze_clause(
    clause_index: int,
    clause: dict,
    contract_type: str,
    qdrant_svc: QdrantService,
    embedder: EmbeddingService,
    semaphore: asyncio.Semaphore,
) -> ClauseAnalysis:
    """Embed clause → search Qdrant → LLM analyze. Guarded by semaphore."""
    async with semaphore:
        clause_text = clause["text"]
        related_laws: list[dict] = []

        try:
            vector = await embedder.embed_single(clause_text[:1000])
            related_laws = await qdrant_svc.search(vector, applies_to=contract_type, limit=5)
        except Exception as exc:
            logger.warning("Qdrant search failed for clause %d: %s", clause_index, exc)

        messages = [
            {"role": "system", "content": CLAUSE_ANALYSIS_SYSTEM},
            {
                "role": "user",
                "content": build_clause_analysis_prompt(clause_text, contract_type, related_laws),
            },
        ]

        try:
            raw = await llm_service.complete(messages, temperature=0.1)
            return _parse_clause_analysis(raw, clause_index, clause_text)
        except Exception as exc:
            logger.error("LLM clause analysis failed (clause %d): %s", clause_index, exc)
            return ClauseAnalysis(
                clause_index=clause_index,
                clause_text=clause_text[:500],
                risk_level=RiskLevel.LOW,
                issues=[f"Lỗi phân tích: {str(exc)[:100]}"],
                legal_references=[],
                suggestion=None,
                suggested_text=None,
                compliant=True,
            )


def _build_risk_summary(clauses: list[ClauseAnalysis]) -> RiskSummary:
    summary = RiskSummary(total_clauses=len(clauses))
    for c in clauses:
        if c.risk_level == RiskLevel.CRITICAL:
            summary.critical += 1
        elif c.risk_level == RiskLevel.HIGH:
            summary.high += 1
        elif c.risk_level == RiskLevel.MEDIUM:
            summary.medium += 1
        else:
            summary.low += 1
    return summary


def _detect_missing_clauses(contract_type: str, clause_texts: list[str]) -> list[str]:
    """Heuristic check for commonly required clauses by contract type."""
    combined = " ".join(clause_texts).lower()
    missing = []

    common_required = {
        "lao_dong": [
            ("thời hạn hợp đồng", "Thời hạn hợp đồng lao động"),
            ("mức lương", "Mức lương / thù lao"),
            ("bảo hiểm xã hội", "Điều khoản bảo hiểm xã hội"),
        ],
        "mua_ban": [
            ("đối tượng hợp đồng", "Đối tượng / hàng hóa"),
            ("giá cả", "Giá cả / thanh toán"),
            ("giao hàng", "Điều khoản giao hàng"),
        ],
        "dich_vu": [
            ("phạm vi dịch vụ", "Phạm vi dịch vụ"),
            ("phí dịch vụ", "Phí / thù lao dịch vụ"),
        ],
    }

    for keyword, label in common_required.get(contract_type, []):
        if keyword not in combined:
            missing.append(label)

    return missing


async def review_contract(
    file: UploadFile,
    qdrant_svc: QdrantService,
) -> ContractReview:
    """Full review pipeline: parse → detect type → split → parallel analyze → aggregate."""
    # 1. Parse file (validates type + size internally)
    text = await parse_file(file)
    if not text.strip():
        raise ValueError("Không thể trích xuất nội dung từ file. File có thể bị hỏng hoặc chỉ chứa ảnh.")

    # 2. Detect contract type
    contract_type = await detect_contract_type(text)

    # 3. Split into clauses
    clauses = split_contract_clauses(text)
    logger.info("Split contract into %d clauses (type=%s)", len(clauses), contract_type)

    # Limit to 30 clauses max to stay within time budget
    if len(clauses) > 30:
        logger.warning("Contract has %d clauses; truncating to 30", len(clauses))
        clauses = clauses[:30]

    # 4. Parallel clause analysis with semaphore
    embedder = EmbeddingService()
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    tasks = [
        _analyze_clause(i, clause, contract_type, qdrant_svc, embedder, semaphore)
        for i, clause in enumerate(clauses)
    ]
    analyzed: list[ClauseAnalysis] = await asyncio.gather(*tasks)

    # 5. Aggregate results
    risk_summary = _build_risk_summary(analyzed)
    missing_clauses = _detect_missing_clauses(contract_type, [c["text"] for c in clauses])

    # Overall assessment text
    if risk_summary.critical > 0:
        overall = f"Hợp đồng có {risk_summary.critical} điều khoản vi phạm pháp luật nghiêm trọng. Cần xem xét lại trước khi ký."
    elif risk_summary.high > 0:
        overall = f"Hợp đồng có {risk_summary.high} điều khoản rủi ro cao. Nên tham khảo luật sư trước khi ký."
    elif risk_summary.medium > 0:
        overall = f"Hợp đồng có {risk_summary.medium} điều khoản cần lưu ý. Xem xét kỹ trước khi ký."
    else:
        overall = "Hợp đồng không có vấn đề pháp lý nghiêm trọng. Có thể xem xét ký kết."

    return ContractReview(
        contract_type=contract_type,
        clauses=analyzed,
        risk_summary=risk_summary,
        overall_assessment=overall,
        missing_mandatory_clauses=missing_clauses,
    )
