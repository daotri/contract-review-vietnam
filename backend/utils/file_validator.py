"""File validation utilities — size, extension, and magic bytes check."""

from fastapi import HTTPException, UploadFile

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

# Magic bytes for file type verification
MAGIC_BYTES = {
    ".pdf": b"%PDF",
    ".docx": b"PK",  # ZIP/DOCX start with PK (ZIP header)
}


async def validate_upload_file(file: UploadFile) -> bytes:
    """Validate uploaded file type, size, and magic bytes. Returns file content."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Check extension
    ext = _get_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Accepted: PDF, DOCX",
        )

    # Read content and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(content) // (1024*1024)}MB). Maximum: 10MB",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    # Check magic bytes
    expected_magic = MAGIC_BYTES.get(ext)
    if expected_magic and not content[:len(expected_magic)].startswith(expected_magic):
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match {ext.upper()} format",
        )

    return content


def _get_extension(filename: str) -> str:
    """Extract lowercase extension from filename."""
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()
