"""Public API routes — contract review and chat endpoints."""

import logging

from fastapi import APIRouter, HTTPException, Request, UploadFile, status

from models.review import ChatRequest, ChatResponse, ContractReview
from prompts.chat_prompt import build_chat_prompt
from services.embedder import EmbeddingService
from services.llm_service import llm_service
from services.reviewer import review_contract

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["public"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.get("/")
async def root():
    """API root — returns service info."""
    return {"service": "contract-review", "version": "0.1.0"}


@router.post("/review", response_model=ContractReview)
async def review_endpoint(request: Request, file: UploadFile):
    """Upload PDF or DOCX contract for AI-powered review.

    Returns clause-by-clause analysis with risk levels and legal references.
    """
    # Validate content type
    content_type = file.content_type or ""
    filename = (file.filename or "").lower()
    is_valid_type = (
        content_type in ALLOWED_CONTENT_TYPES
        or filename.endswith(".pdf")
        or filename.endswith(".docx")
    )
    if not is_valid_type:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Chỉ chấp nhận file PDF hoặc DOCX.",
        )

    qdrant_svc = request.app.state.qdrant_service

    try:
        result = await review_contract(file, qdrant_svc)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during contract review")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi phân tích hợp đồng.",
        )


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: Request, body: ChatRequest):
    """Q&A about a contract using AI with Vietnamese law context.

    Accepts contract text + question, returns answer with law references.
    """
    if not body.contract_text.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="contract_text is required.")
    if not body.question.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="question is required.")

    qdrant_svc = request.app.state.qdrant_service
    embedder = EmbeddingService()

    # Embed question and search related laws
    related_laws: list[dict] = []
    references: list[str] = []
    try:
        vector = await embedder.embed_single(body.question)
        related_laws = await qdrant_svc.search(vector, limit=5)
        references = [
            f"{r.get('law_number', '')} {r.get('article', '')} — {r.get('law_name', '')}".strip()
            for r in related_laws
            if r.get("law_number")
        ]
    except Exception as exc:
        logger.warning("Qdrant search failed for chat: %s", exc)

    messages = build_chat_prompt(
        contract_text=body.contract_text,
        question=body.question,
        related_laws=related_laws,
        history=body.history,
    )

    try:
        answer = await llm_service.complete(messages)
        return ChatResponse(answer=answer, references=references)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during chat")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi xử lý câu hỏi.",
        )
