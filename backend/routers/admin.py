"""Admin API routes — auth, KB management, AI config."""

import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy import text

from config import settings
from database import async_session
from dependencies import verify_session
from models.admin import (
    AIConfigResponse,
    AIConfigUpdate,
    CrawlRequest,
    DiffPreview,
    LoginRequest,
    LawSummary,
)
from services.auth_service import create_session_token, invalidate_session, verify_admin_key
from services.crypto_service import decrypt_api_key, encrypt_api_key, mask_key

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login")
async def admin_login(body: LoginRequest, response: Response):
    """Verify admin key and set session cookie."""
    if not verify_admin_key(body.key):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    token = create_session_token()
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=not settings.debug,
        samesite="strict",
        max_age=8 * 3600,
    )
    return {"status": "ok"}


@router.get("/logout")
async def admin_logout(response: Response, session_token: str = Cookie(default=None)):
    """Clear session cookie."""
    if session_token:
        invalidate_session(session_token)
    response.delete_cookie("session_token")
    return {"status": "ok"}


@router.get("/stats", dependencies=[Depends(verify_session)])
async def admin_stats(request: Request):
    """Dashboard stats: law counts, chunks, current AI model."""
    async with async_session() as db:
        # Law counts
        result = await db.execute(text("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE embedded = TRUE) as embedded FROM laws_raw"))
        row = result.fetchone()
        total_laws = row.total if row else 0
        embedded_laws = row.embedded if row else 0

        # Last crawl
        result = await db.execute(text("SELECT MAX(crawled_at) as last_crawl FROM laws_raw"))
        last_row = result.fetchone()
        last_crawl_at = last_row.last_crawl.isoformat() if last_row and last_row.last_crawl else None

        # AI model
        result = await db.execute(text("SELECT llm_model FROM ai_config WHERE is_active = TRUE"))
        ai_row = result.fetchone()
        current_model = ai_row.llm_model if ai_row else "Not configured"

    # Qdrant chunks
    qdrant_svc = request.app.state.qdrant_service
    collection_info = await qdrant_svc.get_collection_info()
    total_chunks = collection_info.get("points_count", 0)

    return {
        "total_laws": total_laws,
        "embedded_laws": embedded_laws,
        "total_chunks": total_chunks,
        "current_model": current_model,
        "last_crawl_at": last_crawl_at,
    }


# In-memory crawl status tracker
_crawl_status: dict = {"status": "idle", "laws_crawled": 0, "laws_total": 0, "chunks_embedded": 0, "chunks_total": 0, "message": ""}


@router.post("/init", dependencies=[Depends(verify_session)])
async def init_crawl(background_tasks: BackgroundTasks, request: Request):
    """Trigger initial seed law crawl as background task."""
    global _crawl_status
    from seed_laws import SEED_LAWS
    from services.crawl_pipeline import run_initial_crawl
    from services.embedder import EmbeddingService

    if _crawl_status["status"] == "running":
        return {"status": "already_running", "total_laws": _crawl_status["laws_total"]}

    _crawl_status = {"status": "running", "laws_crawled": 0, "laws_total": len(SEED_LAWS), "chunks_embedded": 0, "chunks_total": 0, "message": "Đang thu thập..."}

    async def _run():
        global _crawl_status
        try:
            async with async_session() as db:
                result = await run_initial_crawl(
                    seed_laws=SEED_LAWS,
                    db_session=db,
                    qdrant_service=request.app.state.qdrant_service,
                    embedding_service=EmbeddingService(),
                )
            _crawl_status = {
                "status": "done",
                "laws_crawled": result.get("crawled", 0),
                "laws_total": len(SEED_LAWS),
                "chunks_embedded": result.get("chunks_total", 0),
                "chunks_total": result.get("chunks_total", 0),
                "message": f"Hoàn thành: {result.get('crawled', 0)} luật, {result.get('chunks_total', 0)} đoạn văn",
            }
        except Exception as e:
            _crawl_status = {"status": "error", "laws_crawled": 0, "laws_total": len(SEED_LAWS), "chunks_embedded": 0, "chunks_total": 0, "message": str(e)}

    background_tasks.add_task(_run)
    return {"status": "started", "total_laws": len(SEED_LAWS)}


@router.get("/init/status", dependencies=[Depends(verify_session)])
async def crawl_status():
    """Get current crawl progress."""
    return _crawl_status


@router.post("/crawl", dependencies=[Depends(verify_session)])
async def crawl_new_url(body: CrawlRequest, request: Request):
    """Crawl a new law URL and return diff preview."""
    from services.crawler import crawl_law
    from services.differ import diff_law_versions
    from utils.sanitizer import sanitize_url

    # Validate URL (SSRF protection)
    safe_url = sanitize_url(body.url)

    # Crawl the URL
    crawled = await crawl_law(safe_url)
    if not crawled:
        raise HTTPException(status_code=422, detail="Failed to crawl URL")

    # Check if law exists for diff
    old_articles = []
    async with async_session() as db:
        if body.law_number:
            result = await db.execute(
                text("SELECT articles FROM laws_raw WHERE law_number = :ln"),
                {"ln": body.law_number},
            )
            row = result.fetchone()
            if row and row.articles:
                old_articles = row.articles

    changes = diff_law_versions(old_articles, crawled["articles"])
    return DiffPreview(
        law_number=body.law_number or "unknown",
        law_name=body.law_name or crawled.get("title", ""),
        changes=changes,
    )


@router.get("/laws", dependencies=[Depends(verify_session)])
async def list_laws():
    """List all laws with their status."""
    async with async_session() as db:
        result = await db.execute(
            text("SELECT id, law_number, law_name, priority, embedded, version FROM laws_raw ORDER BY priority, law_number")
        )
        rows = result.fetchall()

    return [
        LawSummary(
            id=row.id, law_number=row.law_number, law_name=row.law_name,
            priority=row.priority, embedded=row.embedded, version=row.version,
        )
        for row in rows
    ]


@router.patch("/laws/{law_id}", dependencies=[Depends(verify_session)])
async def toggle_law_active(law_id: UUID, request: Request):
    """Toggle a law's active status in Qdrant."""
    async with async_session() as db:
        result = await db.execute(
            text("SELECT law_number FROM laws_raw WHERE id = :id"),
            {"id": str(law_id)},
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Law not found")

    # Toggle is_active in Qdrant for all chunks of this law
    qdrant_svc = request.app.state.qdrant_service
    # Note: Qdrant bulk update would be implemented here
    return {"status": "ok", "law_number": row.law_number}


@router.get("/ai-config", dependencies=[Depends(verify_session)])
async def get_ai_config():
    """Get current active AI config with masked key."""
    async with async_session() as db:
        result = await db.execute(
            text("SELECT llm_model, llm_api_key, llm_temperature FROM ai_config WHERE is_active = TRUE")
        )
        row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="No active AI config")

    decrypted_key = decrypt_api_key(row.llm_api_key)
    return AIConfigResponse(
        llm_model=row.llm_model,
        llm_api_key_masked=mask_key(decrypted_key),
        llm_temperature=row.llm_temperature,
        embed_model=settings.embed_model,
        embed_dimension=settings.embed_dimension,
    )


@router.put("/ai-config", dependencies=[Depends(verify_session)])
async def update_ai_config(body: AIConfigUpdate):
    """Update LLM model, key, and temperature."""
    encrypted_key = encrypt_api_key(body.llm_api_key)

    async with async_session() as db:
        await db.execute(
            text("""
                UPDATE ai_config SET
                    llm_model = :model,
                    llm_api_key = :key,
                    llm_temperature = :temp,
                    updated_at = NOW()
                WHERE is_active = TRUE
            """),
            {"model": body.llm_model, "key": encrypted_key, "temp": body.llm_temperature},
        )
        await db.commit()

    return {"status": "ok"}


@router.post("/ai-config/test", dependencies=[Depends(verify_session)])
async def test_ai_config():
    """Test LLM connection with a simple prompt."""
    import time
    import litellm

    async with async_session() as db:
        result = await db.execute(
            text("SELECT llm_model, llm_api_key FROM ai_config WHERE is_active = TRUE")
        )
        row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="No active AI config")

    api_key = decrypt_api_key(row.llm_api_key)
    start = time.monotonic()

    try:
        await litellm.acompletion(
            model=row.llm_model,
            messages=[{"role": "user", "content": "Xin chào"}],
            api_key=api_key,
            max_tokens=10,
        )
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"status": "ok", "latency_ms": latency_ms, "model": row.llm_model}

    except Exception as e:
        return {"status": "error", "error": str(e), "model": row.llm_model}
