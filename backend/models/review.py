"""Pydantic models for contract review responses."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel


class RiskLevel(str, Enum):
    """Risk severity levels for clause analysis."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ClauseAnalysis(BaseModel):
    """Analysis result for a single contract clause."""

    clause_index: int
    clause_text: str
    risk_level: RiskLevel
    issues: list[str]
    legal_references: list[str]
    suggestion: str | None = None
    suggested_text: str | None = None
    compliant: bool = True


class RiskSummary(BaseModel):
    """Aggregated risk summary for the entire contract."""

    total_clauses: int
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class ContractReview(BaseModel):
    """Complete contract review response."""

    contract_type: str
    clauses: list[ClauseAnalysis]
    risk_summary: RiskSummary
    overall_assessment: str
    missing_mandatory_clauses: list[str] = []


class ChatMessage(BaseModel):
    """A single chat message with constrained role."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """Request body for contract Q&A chat."""

    contract_text: str
    question: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    """Response for contract Q&A chat."""

    answer: str
    references: list[str] = []
