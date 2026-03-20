# Code Standards — Vietnamese Law Contract Review App

**Version:** 1.0
**Date:** 2026-03-20
**Scope:** Backend (Python/FastAPI), Frontend (TypeScript/Next.js), SQL, Dockerfile

---

## General Principles

1. **Type Safety First:** All code must have explicit type hints (Python, TypeScript)
2. **Async-First (Backend):** Use async/await, avoid blocking I/O
3. **Stateless Where Possible:** Minimize shared state, leverage immutability
4. **Security by Default:** Never log secrets, validate inputs, encrypt sensitive data
5. **Self-Documenting Code:** Clear names, minimal comments needed (comments for "why", not "what")
6. **DRY (Don't Repeat Yourself):** Extract common logic into reusable utilities

---

## Backend (Python 3.11 + FastAPI)

### File Organization

```
backend/
├── main.py                  # FastAPI app, lifespan, CORS
├── config.py                # Settings + validation
├── database.py              # Engine, session factory
├── models/
│   ├── __init__.py
│   ├── law.py               # LawDocument, LawChunk, AIConfig
│   └── review.py            # ClauseAnalysis, ContractReview, RiskLevel
├── routers/
│   ├── __init__.py
│   ├── public.py            # /api/* endpoints
│   └── admin.py             # /admin/* endpoints
├── services/                # Business logic (to be implemented)
│   ├── __init__.py
│   ├── parser.py            # PDF/DOCX parsing
│   ├── reviewer.py          # Risk detection
│   ├── embedder.py          # Chunking + embedding
│   ├── crawler.py           # Web crawling
│   └── differ.py            # Diff logic
├── migrations/
│   └── 001-init-schema.sql
├── Dockerfile
├── requirements.txt
└── .gitignore
```

### Naming Conventions

| Item | Style | Example |
|------|-------|---------|
| Module files | snake_case | `parser.py`, `law_crawler.py` |
| Classes | PascalCase | `LawDocument`, `ContractReview` |
| Functions/methods | snake_case | `get_laws()`, `analyze_risk()` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `EMBED_DIMENSION` |
| Private methods | _snake_case | `_validate_input()` |
| Type aliases | PascalCase | `LawList = list[LawDocument]` |

### Type Hints

**Every function must have type hints:**

```python
# ✓ GOOD
async def review_contract(
    file_bytes: bytes,
    contract_type: str | None = None,
) -> ContractReview:
    """Analyze contract against Vietnamese law."""
    pass

# ✗ BAD — missing return type
async def review_contract(file_bytes: bytes):
    pass

# ✓ GOOD — Optional + union
async def get_law(law_id: str) -> LawDocument | None:
    pass

# ✗ BAD — ambiguous Optional
from typing import Optional
async def get_law(law_id: str) -> Optional[LawDocument]:  # Use | None instead
    pass
```

### Pydantic v2 Models

```python
from pydantic import BaseModel, Field, SecretStr, field_validator
from datetime import datetime
from uuid import UUID

class LawDocument(BaseModel):
    """Database model for Vietnamese law."""

    id: UUID
    law_number: str = Field(..., min_length=1, max_length=50)
    law_name: str = Field(..., min_length=1, max_length=255)
    applies_to: list[str]
    priority: int | None = None
    full_text: str | None = None
    source_url: str | None = None
    crawled_at: datetime | None = None
    embedded: bool = False
    version: int = Field(default=1, ge=1)

    @field_validator('law_number')
    @classmethod
    def validate_law_number(cls, v: str) -> str:
        """Ensure law_number matches Vietnamese format."""
        if not is_valid_vietnamese_law_number(v):
            raise ValueError("Invalid Vietnamese law number")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "law_number": "91/2015/QH13",
                "law_name": "Bộ luật Dân sự 2015",
                "applies_to": ["mua_ban", "dich_vu"],
                "priority": 1,
                "embedded": True,
            }
        }
    }

# Request/Response models
class ContractReviewRequest(BaseModel):
    """Request to review a contract."""

    file: bytes  # Binary PDF/DOCX
    contract_type: str | None = Field(None, description="Optional contract type hint")

    model_config = {
        "json_schema_extra": {
            "example": {
                "file": "<binary>",
                "contract_type": "sales"
            }
        }
    }

# API Key Storage — use SecretStr for sensitive data
class AIConfig(BaseModel):
    """AI provider configuration."""

    id: UUID
    llm_model: str
    llm_api_key: SecretStr  # ✓ Automatically hidden in logging/repr
    llm_temperature: float = Field(default=0.1, ge=0.0, le=1.0)
    is_active: bool = True
```

### Async Functions

**Always async for I/O operations:**

```python
# ✓ GOOD
async def fetch_law_from_db(law_id: UUID, db: AsyncSession) -> LawDocument:
    """Fetch law by ID."""
    stmt = select(Law).where(Law.id == law_id)
    result = await db.execute(stmt)
    law = result.scalar_one_or_none()
    return law

# ✗ BAD — blocking I/O in async function
async def fetch_law_from_db(law_id: UUID, db: AsyncSession) -> LawDocument:
    time.sleep(1)  # Blocks event loop!
    stmt = select(Law).where(Law.id == law_id)
    result = await db.execute(stmt)
    return result.scalar_one()

# ✓ GOOD — use asyncio.sleep
import asyncio
await asyncio.sleep(1)  # Non-blocking
```

### FastAPI Routes

```python
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api", tags=["review"])

@router.post("/review", response_model=ContractReview)
async def review_contract(
    file: UploadFile = File(...),
    contract_type: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> ContractReview:
    """
    Analyze contract against Vietnamese law.

    - **file:** PDF or DOCX file (max 10MB)
    - **contract_type:** Optional contract type hint (auto-detected if omitted)

    Returns: ContractReview with risk analysis
    """
    # Validate file size
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=400,
            detail="File too large (max 10MB)"
        )

    # Validate file type
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files supported"
        )

    try:
        review = await analyze_contract(contents, contract_type, db)
        return review
    except Exception as e:
        raise HTTPException(status_code=500, detail="Analysis failed") from e

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """Health check endpoint."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        return {"status": "error"}
```

### Error Handling

```python
# ✓ GOOD — specific exceptions with context
class LawNotFoundError(Exception):
    """Raised when law document not found."""
    def __init__(self, law_id: UUID):
        self.law_id = law_id
        super().__init__(f"Law {law_id} not found")

# ✓ GOOD — use HTTPException for API errors
@router.get("/laws/{law_id}")
async def get_law(law_id: UUID, db: AsyncSession = Depends(get_db)):
    law = await fetch_law_by_id(law_id, db)
    if not law:
        raise HTTPException(status_code=404, detail="Law not found")
    return law

# ✗ BAD — catch-all exceptions
try:
    result = do_something()
except Exception:  # Too broad!
    return {"error": "Something went wrong"}

# ✓ GOOD — catch specific exceptions
try:
    result = await db.execute(stmt)
except sqlalchemy.exc.IntegrityError as e:
    raise HTTPException(status_code=409, detail="Duplicate law") from e
except sqlalchemy.exc.OperationalError as e:
    raise HTTPException(status_code=503, detail="Database unavailable") from e
```

### Logging

```python
import logging

logger = logging.getLogger(__name__)

# ✓ GOOD — structured logging
logger.info("Contract review started", extra={
    "contract_type": contract_type,
    "clause_count": len(clauses),
})

logger.error("LLM API failed", exc_info=True, extra={
    "model": settings.llm_model,
    "status_code": response.status_code,
})

# ✗ BAD — log secrets
logger.info(f"API key: {settings.llm_api_key}")  # NEVER!

# ✓ GOOD — redact sensitive data
logger.debug(f"API key: {mask_api_key(settings.llm_api_key)}")

def mask_api_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}{'*' * 12}{key[-4:]}"
```

### Configuration (Pydantic Settings)

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application configuration from environment variables."""

    # Database
    database_url: str = "postgresql+asyncpg://user:pass@host/db"

    # Qdrant
    qdrant_url: str = "http://qdrant:6333"
    qdrant_grpc_port: int = 6334
    qdrant_api_key: str = ""

    # Embedding (fixed — do not change after init)
    embed_model: str = "text-embedding-3-small"
    embed_dimension: int = 1536
    embed_api_key: str  # Must be provided

    # LLM (changeable via admin UI)
    llm_model: str = "claude-sonnet-4-6"
    llm_api_key: str = ""

    # Admin
    admin_key_hash: str  # SHA-256(admin_key), never store plain text
    session_secret: str  # For signing session cookies

    # App
    cors_origins: str = "http://localhost:3000"
    max_file_size: int = 10 * 1024 * 1024  # 10MB

    model_config = {
        "env_file": ".env",
        "extra": "ignore",  # Ignore unknown env vars
    }

settings = Settings()
```

---

## Frontend (TypeScript + Next.js 14)

### File Organization

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Admin home
│   │   ├── login/page.tsx
│   │   ├── crawl/page.tsx
│   │   ├── laws/page.tsx
│   │   └── ai-config/page.tsx
│   ├── api/                 # Optional route handlers
│   └── globals.css
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   │   └── button.tsx
│   ├── UploadForm.tsx
│   ├── RiskReport.tsx
│   └── ChatBox.tsx
├── lib/
│   ├── utils.ts             # Utility functions
│   ├── api-client.ts        # HTTP client
│   └── types.ts             # Shared TypeScript types
├── tsconfig.json            # Strict mode enabled
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

### Naming Conventions

| Item | Style | Example |
|------|-------|---------|
| Files (components) | PascalCase | `UploadForm.tsx`, `RiskReport.tsx` |
| Files (utilities) | camelCase | `api-client.ts`, `utils.ts` |
| Types/Interfaces | PascalCase | `ContractReview`, `ClauseAnalysis` |
| Functions/variables | camelCase | `getContractType()`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_TIMEOUT` |

### TypeScript Configuration

**tsconfig.json — Strict Mode:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Type Definitions

```typescript
// lib/types.ts
export interface ClauseAnalysis {
  clause_index: number;
  clause_text: string;
  risk_level: "critical" | "high" | "medium" | "low";
  issues: string[];
  legal_references: string[];
  suggestion?: string;
}

export interface RiskSummary {
  total_clauses: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ContractReview {
  contract_type: string;
  clauses: ClauseAnalysis[];
  risk_summary: RiskSummary;
  overall_assessment: string;
}

// ✓ GOOD — explicit return types
export async function reviewContract(
  file: File,
  contractType?: string
): Promise<ContractReview> {
  const formData = new FormData();
  formData.append("file", file);
  if (contractType) {
    formData.append("contract_type", contractType);
  }

  const response = await fetch("/api/review", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Review failed: ${response.statusText}`);
  }

  return response.json();
}
```

### React Components

```typescript
// ✓ GOOD — typed functional component with explicit props
"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface UploadFormProps {
  onSubmit: (file: File, contractType?: string) => Promise<void>;
  isLoading?: boolean;
}

export default function UploadForm({
  onSubmit,
  isLoading = false,
}: UploadFormProps): ReactNode {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const contractType = formData.get("contract_type") as string | null;

    if (!file) {
      alert("Please select a file");
      return;
    }

    try {
      await onSubmit(file, contractType || undefined);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="file"
        name="file"
        accept=".pdf,.docx"
        required
        disabled={isLoading}
      />
      <select name="contract_type" disabled={isLoading}>
        <option value="">Auto-detect</option>
        <option value="sales">Sales</option>
        <option value="labor">Labor</option>
        <option value="service">Service</option>
        <option value="construction">Construction</option>
      </select>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Analyzing..." : "Review Contract"}
      </Button>
    </form>
  );
}
```

### API Client

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_TIMEOUT = 60000; // 60s

async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getContractReview(
  file: File,
  contractType?: string
): Promise<ContractReview> {
  const formData = new FormData();
  formData.append("file", file);
  if (contractType) {
    formData.append("contract_type", contractType);
  }

  const response = await fetch(`${API_BASE_URL}/api/review`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Review failed: ${response.statusText}`);
  }

  return response.json();
}
```

### Testing

```typescript
// components/__tests__/UploadForm.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import UploadForm from "@/components/UploadForm";

describe("UploadForm", () => {
  it("should render upload input", () => {
    const mockSubmit = jest.fn();
    render(<UploadForm onSubmit={mockSubmit} />);

    expect(screen.getByText("Review Contract")).toBeInTheDocument();
  });

  it("should call onSubmit with file", async () => {
    const mockSubmit = jest.fn().mockResolvedValue(undefined);
    render(<UploadForm onSubmit={mockSubmit} />);

    const file = new File(["content"], "contract.pdf", {
      type: "application/pdf",
    });
    const input = screen.getByRole("input", { name: /file/i }) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Review Contract"));

    expect(mockSubmit).toHaveBeenCalledWith(file, undefined);
  });
});
```

---

## SQL Standards

### Schema Definition

```sql
-- ✓ GOOD — clear data types, constraints, indexes
CREATE TABLE IF NOT EXISTS laws_raw (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_number      VARCHAR NOT NULL,
    law_name        VARCHAR NOT NULL,
    applies_to      TEXT[],
    priority        INTEGER,
    full_text       TEXT,
    articles        JSONB,
    source_url      VARCHAR,
    crawled_at      TIMESTAMPTZ,           -- Always use timezone-aware timestamps
    embedded        BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 1
);

-- Indexes on lookup columns
CREATE INDEX IF NOT EXISTS idx_laws_raw_law_number ON laws_raw(law_number);
CREATE INDEX IF NOT EXISTS idx_laws_raw_embedded ON laws_raw(embedded) WHERE embedded = FALSE;

-- ✗ BAD — unclear data types, no constraints
CREATE TABLE bad_laws (
    id SERIAL PRIMARY KEY,
    law_number VARCHAR,
    crawled_at TIMESTAMP    -- No timezone!
);
```

### Key Guidelines

1. **TIMESTAMPTZ (not TIMESTAMP):** All timestamps must include timezone
2. **UUID for IDs:** Use gen_random_uuid() as default
3. **Indexes:** Add on foreign keys and frequently filtered columns
4. **Constraints:** NOT NULL, UNIQUE, CHECK where appropriate
5. **Comments:** Add for non-obvious columns

```sql
CREATE TABLE law_changelog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    changed_at      TIMESTAMPTZ DEFAULT NOW(),
    law_number      VARCHAR NOT NULL,
    change_type     VARCHAR NOT NULL CHECK (change_type IN ('new', 'amended', 'repealed')),
    article_id      VARCHAR,
    old_content     TEXT,
    new_content     TEXT,
    confirmed_by    VARCHAR,
    CONSTRAINT fk_law_changelog_law
        FOREIGN KEY (law_number) REFERENCES laws_raw(law_number)
);

-- Track changes for audit purposes
CREATE INDEX idx_law_changelog_changed_at ON law_changelog(changed_at DESC);
```

---

## Docker Standards

### Dockerfile Best Practices

```dockerfile
# ✓ GOOD — multi-stage, non-root user, minimal image
FROM python:3.11-slim as builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Run as non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# ✗ BAD — large image, root user, no layer caching
FROM python:3.11
RUN pip install -r requirements.txt  # Reinstalls on every change
COPY . /app
WORKDIR /app
CMD ["python", "main.py"]
```

---

## Testing Standards

### Python (pytest)

```python
# tests/test_reviewer.py
import pytest
from backend.services.reviewer import analyze_risk

@pytest.mark.asyncio
async def test_analyze_risk_with_critical_clause():
    """Test risk detection for critical clause."""
    clause = "Bên mua không chịu trách nhiệm với bất kỳ lỗi nào"
    risk = await analyze_risk(clause, contract_type="sales")

    assert risk.risk_level == "CRITICAL"
    assert len(risk.issues) > 0
    assert any("trách nhiệm" in issue for issue in risk.issues)

@pytest.mark.asyncio
async def test_analyze_risk_with_valid_clause():
    """Test risk detection for compliant clause."""
    clause = "Bên mua có quyền kiểm hàng trong vòng 7 ngày kể từ khi nhận hàng"
    risk = await analyze_risk(clause, contract_type="sales")

    assert risk.risk_level in ["LOW", "MEDIUM"]
```

### TypeScript (Vitest/Jest)

```typescript
// components/__tests__/RiskReport.test.tsx
import { render, screen } from "@testing-library/react";
import RiskReport from "@/components/RiskReport";

describe("RiskReport", () => {
  it("should highlight critical risks in red", () => {
    const review = {
      risk_summary: { critical: 1, high: 0, medium: 0, low: 0, total_clauses: 1 },
      clauses: [
        {
          clause_index: 0,
          risk_level: "critical",
          issues: ["Invalid clause"],
          legal_references: [],
          clause_text: "...",
          suggestion: "Remove this clause",
        },
      ],
    };

    render(<RiskReport review={review} />);
    const criticalItem = screen.getByText(/Invalid clause/);
    expect(criticalItem).toHaveClass("text-red-600");
  });
});
```

---

## Git Conventions

### Commit Messages

**Format:** `<type>(<scope>): <subject>`

```
feat(backend): add contract risk analysis endpoint
fix(frontend): display law references in correct order
docs: update system architecture
test(reviewer): add test for critical clause detection
chore(deps): upgrade sqlalchemy to 2.0.35
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Test addition/modification
- `chore:` Dependencies, build, CI
- `refactor:` Code reorganization (no functional change)

### Branch Naming

```
feature/contract-parser
bugfix/law-search-accuracy
docs/api-documentation
```

---

## Security Checklist

- [ ] No hardcoded secrets in code
- [ ] API keys stored in .env (dev) or Secret Manager (prod)
- [ ] Pydantic SecretStr for sensitive fields
- [ ] Input validation on all endpoints
- [ ] Rate limiting on public endpoints
- [ ] CORS whitelist configured
- [ ] SQL: Use parameterized queries (SQLAlchemy ORM handles this)
- [ ] Logging: Never log secrets or PII
- [ ] HTTPS enforced in production
- [ ] Database backups tested

---

## Performance Checklist

- [ ] Database indexes on filter/join columns
- [ ] Connection pooling configured (min 5, max 15)
- [ ] Async I/O for all database operations
- [ ] Batch operations where possible (e.g., bulk embed)
- [ ] Caching strategy for expensive queries (future)
- [ ] Rate limiting to prevent abuse
- [ ] File size limits enforced (max 10MB)
- [ ] Graceful degradation (e.g., if Qdrant unavailable)

---

**Last Updated:** 2026-03-20
**Next Review:** End of Phase 02
