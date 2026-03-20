"""Vietnamese legal text chunker — splits by Điều/Khoản/Điểm hierarchy."""

import re
import hashlib
import logging

logger = logging.getLogger(__name__)

MIN_CHUNK_LENGTH = 50


def chunk_law_text(articles: list[dict], law_metadata: dict) -> list[dict]:
    """Split structured articles into chunks for embedding.

    Each chunk contains: chunk_id, law_number, law_name, article,
    clause, text, applies_to.

    chunk_id format: {LAW_CODE}_{Dieu}_{Khoan} for deduplication.
    """
    law_number = law_metadata["law_number"]
    law_name = law_metadata["law_name"]
    applies_to = law_metadata.get("applies_to", [])
    law_code = _make_law_code(law_number)

    chunks = []
    for article in articles:
        article_num = article.get("article_number", "")
        article_title = article.get("title", "")
        content = article.get("content", "")

        # Try to split by Khoản (clause)
        clauses = _split_by_khoan(content)

        if clauses:
            for clause_num, clause_text in clauses:
                chunk_text = _build_chunk_text(law_name, article_num, article_title, clause_num, clause_text)
                if len(chunk_text) < MIN_CHUNK_LENGTH:
                    continue

                chunk_id = f"{law_code}_Dieu_{article_num}_Khoan_{clause_num}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "point_id": _deterministic_id(chunk_id),
                    "law_number": law_number,
                    "law_name": law_name,
                    "article": article_num,
                    "clause": clause_num,
                    "text": chunk_text,
                    "applies_to": applies_to,
                })
        else:
            # No clauses found — use the whole article as one chunk
            chunk_text = _build_chunk_text(law_name, article_num, article_title, None, content)
            if len(chunk_text) < MIN_CHUNK_LENGTH:
                continue

            chunk_id = f"{law_code}_Dieu_{article_num}"
            chunks.append({
                "chunk_id": chunk_id,
                "point_id": _deterministic_id(chunk_id),
                "law_number": law_number,
                "law_name": law_name,
                "article": article_num,
                "clause": None,
                "text": chunk_text,
                "applies_to": applies_to,
            })

    logger.info("Chunked %s: %d articles → %d chunks", law_number, len(articles), len(chunks))
    return chunks


def _split_by_khoan(text: str) -> list[tuple[str, str]]:
    """Split article content by Khoản (clause) markers.

    Returns list of (clause_number, clause_text) tuples.
    """
    # Match "1." or "2." at start of line, or "Khoản 1" patterns
    pattern = r"(?:^|\n)\s*(\d+)\.\s+"
    matches = list(re.finditer(pattern, text))

    if len(matches) < 2:
        return []

    clauses = []
    for i, match in enumerate(matches):
        clause_num = match.group(1)
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        clause_text = text[start:end].strip()
        clauses.append((clause_num, clause_text))

    return clauses


def _build_chunk_text(
    law_name: str, article_num: str, article_title: str, clause_num: str | None, content: str
) -> str:
    """Build the chunk text with context prefix for better embedding quality."""
    parts = [f"{law_name}"]
    if article_num:
        parts.append(f"Điều {article_num}")
    if article_title:
        parts[-1] += f": {article_title}"
    if clause_num:
        parts.append(f"Khoản {clause_num}")
    parts.append(content)
    return "\n".join(parts)


def _make_law_code(law_number: str) -> str:
    """Convert law number to a short code for chunk IDs."""
    # Remove special chars, replace / with _
    return re.sub(r"[^a-zA-Z0-9]", "_", law_number).strip("_")


def _deterministic_id(chunk_id: str) -> int:
    """Generate a deterministic integer ID from chunk_id for Qdrant point ID."""
    # Use first 16 hex chars of SHA-256 → 64-bit integer (Qdrant uses u64)
    hash_hex = hashlib.sha256(chunk_id.encode()).hexdigest()[:16]
    return int(hash_hex, 16)
