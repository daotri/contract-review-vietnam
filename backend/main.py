"""FastAPI application entry point with lifespan management."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import settings
from database import engine
from middleware.error_handler import ErrorHandlerMiddleware
from middleware.rate_limiter import RateLimiterMiddleware
from middleware.security_headers import SecurityHeadersMiddleware
from routers.admin import router as admin_router
from routers.public import router as public_router
from services.vector_service import VectorService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB pool and VectorService on startup, cleanup on shutdown."""
    # Verify database connection
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))

    # Initialize VectorService (pgvector — table managed by migration)
    vector_svc = VectorService()
    await vector_svc.init_collection()
    app.state.vector_service = vector_svc

    yield

    # Cleanup
    await engine.dispose()


app = FastAPI(
    title="Contract Review API",
    description="AI-powered contract review against Vietnamese law",
    version="0.1.0",
    lifespan=lifespan,
)

# Middleware (order matters: last added = first executed)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH"],
    allow_headers=["Content-Type"],
)

# Routers
app.include_router(public_router)
app.include_router(admin_router)


@app.get("/health")
async def health_check():
    """Health check — verify DB connectivity."""
    db_ok = False

    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    return {"status": "ok" if db_ok else "degraded", "db": db_ok}
