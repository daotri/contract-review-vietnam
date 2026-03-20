"""Pydantic models for law documents and AI configuration."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, SecretStr


class LawDocument(BaseModel):
    """A Vietnamese law document stored in PostgreSQL."""

    id: UUID
    law_number: str
    law_name: str
    applies_to: list[str]
    priority: int | None = None
    source_url: str | None = None
    crawled_at: datetime | None = None
    embedded: bool = False
    version: int = 1


class LawChunk(BaseModel):
    """A chunk of law text for vector embedding."""

    law_number: str
    article_id: str
    content: str
    applies_to: list[str]
    effective_date: str | None = None


class AIConfig(BaseModel):
    """AI provider configuration stored in PostgreSQL."""

    id: UUID
    llm_model: str
    llm_api_key: SecretStr
    llm_temperature: float = 0.1
    updated_by: str | None = None
    updated_at: datetime | None = None
    is_active: bool = True
