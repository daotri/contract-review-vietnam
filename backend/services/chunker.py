"""Vietnamese legal text chunker — splits by Dieu/Khoan/Diem hierarchy."""

import re
import hashlib
import logging

logger = logging.getLogger(__name__)

# Chunks shorter than this are merged into the previous chunk
MIN_CHUNK_LENGTH = 100
# Chunks longer than this are split further by Diem or sentence boundaries
MAX_CHUNK_LENGTH = 1500


def chunk_law_text(articles: list[dict], law_metadata: dict) -> list[dict]:
    """Split structured articles into chunks for embedding.

    Hierarchy: Dieu (article) -> Khoan (clause) -> Diem (point).
    Chunks that are too small get merged; chunks too large get split by Diem.
    """
    law_number = law_metadata["law_number"]
    law_name = law_metadata["law_name"]
    applies_to = law_metadata.get("applies_to", [])
    law_code = _make_law_code(law_number)

    raw_chunks = []
    for article in articles:
        article_num = article.get("article_number", "")
        article_title = article.get("title", "")
        content = article.get("content", "")

        # Try to split by Khoan (clause)
        clauses = _split_by_khoan(content)

        if clauses:
            for clause_num, clause_text in clauses:
                _add_clause_chunks(
                    raw_chunks, law_name, law_code, law_number, applies_to,
                    article_num, article_title, clause_num, clause_text,
                )
        else:
            # No clauses — use the whole article as one chunk
            chunk_text = _build_chunk_text(law_name, article_num, article_title, None, None, content)
            if len(chunk_text) >= MIN_CHUNK_LENGTH:
                raw_chunks.append({
                    "chunk_id": f"{law_code}_Dieu_{article_num}",
                    "point_id": _deterministic_id(f"{law_code}_Dieu_{article_num}"),
                    "law_number": law_number,
                    "law_name": law_name,
                    "article": article_num,
                    "clause": None,
                    "text": chunk_text,
                    "applies_to": applies_to,
                })

    # Post-process: merge tiny chunks into their predecessor
    chunks = _merge_small_chunks(raw_chunks)

    logger.info("Chunked %s: %d articles -> %d chunks", law_number, len(articles), len(chunks))
    return chunks


def _add_clause_chunks(
    chunks: list[dict],
    law_name: str, law_code: str, law_number: str, applies_to: list,
    article_num: str, article_title: str, clause_num: str, clause_text: str,
) -> None:
    """Add chunks for a single Khoan, splitting by Diem if too large."""
    chunk_text = _build_chunk_text(law_name, article_num, article_title, clause_num, None, clause_text)
    base_id = f"{law_code}_Dieu_{article_num}_Khoan_{clause_num}"

    # If chunk is within limit, add as-is
    if len(chunk_text) <= MAX_CHUNK_LENGTH:
        if len(chunk_text) >= MIN_CHUNK_LENGTH:
            chunks.append({
                "chunk_id": base_id,
                "point_id": _deterministic_id(base_id),
                "law_number": law_number,
                "law_name": law_name,
                "article": article_num,
                "clause": clause_num,
                "text": chunk_text,
                "applies_to": applies_to,
            })
        return

    # Chunk too large — try splitting by Diem (a, b, c...)
    diems = _split_by_diem(clause_text)
    if diems:
        for diem_label, diem_text in diems:
            sub_text = _build_chunk_text(law_name, article_num, article_title, clause_num, diem_label, diem_text)
            if len(sub_text) < MIN_CHUNK_LENGTH:
                continue
            sub_id = f"{base_id}_Diem_{diem_label}"
            chunks.append({
                "chunk_id": sub_id,
                "point_id": _deterministic_id(sub_id),
                "law_number": law_number,
                "law_name": law_name,
                "article": article_num,
                "clause": clause_num,
                "text": sub_text,
                "applies_to": applies_to,
            })
    else:
        # No Diem found — split by max size with overlap
        sub_chunks = _split_long_text(clause_text, MAX_CHUNK_LENGTH)
        for idx, sub_text in enumerate(sub_chunks):
            full_text = _build_chunk_text(law_name, article_num, article_title, clause_num, None, sub_text)
            if len(full_text) < MIN_CHUNK_LENGTH:
                continue
            sub_id = f"{base_id}_p{idx + 1}" if len(sub_chunks) > 1 else base_id
            chunks.append({
                "chunk_id": sub_id,
                "point_id": _deterministic_id(sub_id),
                "law_number": law_number,
                "law_name": law_name,
                "article": article_num,
                "clause": clause_num,
                "text": full_text,
                "applies_to": applies_to,
            })


def _split_by_khoan(text: str) -> list[tuple[str, str]]:
    """Split article content by Khoan (clause) markers.

    Matches "1. " at start of line — requires the number to be sequential
    starting from 1 to avoid false positives (dates, list items mid-text).
    """
    pattern = r"(?:^|\n)\s*(\d+)\.\s+"
    matches = list(re.finditer(pattern, text))

    if len(matches) < 2:
        return []

    # Validate: first match should be "1" to confirm these are Khoan markers
    if matches[0].group(1) != "1":
        return []

    clauses = []
    for i, match in enumerate(matches):
        clause_num = match.group(1)
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        clause_text = text[start:end].strip()
        clauses.append((clause_num, clause_text))

    return clauses


def _split_by_diem(text: str) -> list[tuple[str, str]]:
    """Split clause content by Diem (point) markers: a), b), c)...

    Vietnamese legal text uses: a), b), c) or a., b., c. at start of line.
    """
    pattern = r"(?:^|\n)\s*([a-z])[)\.]\s+"
    matches = list(re.finditer(pattern, text))

    if len(matches) < 2:
        return []

    # Validate: first match should be "a"
    if matches[0].group(1) != "a":
        return []

    diems = []
    for i, match in enumerate(matches):
        label = match.group(1)
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        diem_text = text[start:end].strip()
        diems.append((label, diem_text))

    return diems


def _split_long_text(text: str, max_len: int) -> list[str]:
    """Split long text by sentence boundaries with overlap.

    Tries to split at sentence endings (. or ;) near the max_len boundary.
    Adds ~100 chars overlap for context continuity.
    """
    if len(text) <= max_len:
        return [text]

    overlap = 100
    parts = []
    pos = 0

    while pos < len(text):
        end = pos + max_len
        if end >= len(text):
            parts.append(text[pos:].strip())
            break

        # Find nearest sentence boundary (. or ;) before max_len
        split_at = end
        for sep in [".\n", ";\n", ". ", "; "]:
            last_sep = text.rfind(sep, pos + max_len // 2, end)
            if last_sep > 0:
                split_at = last_sep + len(sep)
                break

        parts.append(text[pos:split_at].strip())
        # Overlap: start next chunk a bit before the split point
        pos = max(split_at - overlap, pos + max_len // 2)

    return parts


def _merge_small_chunks(chunks: list[dict]) -> list[dict]:
    """Merge chunks shorter than MIN_CHUNK_LENGTH into the previous chunk.

    Only merges if both chunks belong to the same article.
    """
    if not chunks:
        return chunks

    merged = [chunks[0]]
    for chunk in chunks[1:]:
        prev = merged[-1]
        # Merge if current chunk is tiny AND same article
        if len(chunk["text"]) < MIN_CHUNK_LENGTH and chunk["article"] == prev["article"]:
            prev["text"] += "\n" + chunk["text"]
        else:
            merged.append(chunk)

    return merged


def _build_chunk_text(
    law_name: str, article_num: str, article_title: str,
    clause_num: str | None, diem_label: str | None, content: str,
) -> str:
    """Build chunk text with context prefix for better embedding quality."""
    parts = [law_name]
    if article_num:
        parts.append(f"Dieu {article_num}")
    if article_title:
        parts[-1] += f": {article_title}"
    if clause_num:
        parts.append(f"Khoan {clause_num}")
    if diem_label:
        parts.append(f"Diem {diem_label}")
    parts.append(content)
    return "\n".join(parts)


def _make_law_code(law_number: str) -> str:
    """Convert law number to a short code for chunk IDs."""
    return re.sub(r"[^a-zA-Z0-9]", "_", law_number).strip("_")


def _deterministic_id(chunk_id: str) -> int:
    """Generate a deterministic integer ID from chunk_id (legacy compatibility)."""
    hash_hex = hashlib.sha256(chunk_id.encode()).hexdigest()[:16]
    return int(hash_hex, 16)
