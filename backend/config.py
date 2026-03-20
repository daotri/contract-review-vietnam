"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """All app settings read from environment."""

    # Database
    database_url: str = "postgresql+asyncpg://contract_ai:local_dev_password@postgres:5432/contract_ai"

    # Qdrant
    qdrant_url: str = "http://qdrant:6333"
    qdrant_grpc_port: int = 6334
    qdrant_api_key: str = ""

    # Embedding (fixed — do not change after init)
    embed_model: str = "text-embedding-3-small"
    embed_dimension: int = 1536
    embed_api_key: str = ""

    # LLM (initial — changeable via admin UI)
    llm_model: str = "claude-sonnet-4-6"
    llm_api_key: str = ""

    # Admin
    admin_key_hash: str = ""
    session_secret: str = ""

    # App
    cors_origins: str = "http://localhost:3000"
    debug: bool = True  # Set False in production

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
