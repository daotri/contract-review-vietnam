"""Pydantic models for admin API request/response schemas."""

from uuid import UUID

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Admin login request."""
    key: str


class CrawlRequest(BaseModel):
    """Request to crawl a new law URL."""
    url: str
    law_number: str | None = None
    law_name: str | None = None
    applies_to: list[str] = []


class CrawlConfirmRequest(BaseModel):
    """Confirm applying changes after diff preview."""
    law_id: UUID
    article_ids: list[str]


class DiffItem(BaseModel):
    """A single change in a law diff."""
    change_type: str  # 'new', 'amended', 'repealed'
    article_id: str
    old_content: str | None = None
    new_content: str | None = None


class DiffPreview(BaseModel):
    """Preview of changes from a crawl."""
    law_number: str
    law_name: str
    changes: list[DiffItem]


class AIConfigUpdate(BaseModel):
    """Update AI provider configuration."""
    llm_model: str
    llm_api_key: str
    llm_temperature: float = 0.1


class AIConfigResponse(BaseModel):
    """AI config response with masked key."""
    llm_model: str
    llm_api_key_masked: str
    llm_temperature: float
    embed_model: str
    embed_dimension: int


class LawSummary(BaseModel):
    """Law summary for admin list view."""
    id: UUID
    law_number: str
    law_name: str
    priority: int | None
    embedded: bool
    version: int
