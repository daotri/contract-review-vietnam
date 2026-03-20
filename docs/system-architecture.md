# System Architecture — Vietnamese Law Contract Review App

**Version:** 1.0
**Date:** 2026-03-20

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Internet / Client                        │
└────────────────────┬───────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼──────────┐      ┌──────▼──────────┐
   │  Frontend     │      │  Admin UI       │
   │  (Next.js 14) │      │  (Next.js 14)   │
   │  Port 3000    │      │  Port 3000      │
   └────┬──────────┘      └──────┬──────────┘
        │                        │
        └────────────┬───────────┘
                     │
        ┌────────────▼──────────────────────┐
        │     FastAPI Backend                │
        │     Port 8000                      │
        │  ┌──────────────────────────────┐  │
        │  │  Public Routes               │  │
        │  │  /api/review                 │  │
        │  │  /api/chat                   │  │
        │  │  /health                     │  │
        │  └──────────────────────────────┘  │
        │  ┌──────────────────────────────┐  │
        │  │  Admin Routes (Protected)    │  │
        │  │  /admin/login                │  │
        │  │  /admin/ai-config            │  │
        │  │  /admin/crawl                │  │
        │  │  /admin/laws                 │  │
        │  └──────────────────────────────┘  │
        │  ┌──────────────────────────────┐  │
        │  │  Services                    │  │
        │  │  • LLM Integration (LiteLLM) │  │
        │  │  • Embeddings                │  │
        │  │  • Parser (PDF/DOCX)         │  │
        │  │  • Risk Detection            │  │
        │  └──────────────────────────────┘  │
        └────┬──────────────┬────────────────┘
             │              │
    ┌────────▼────┐   ┌─────▼──────────┐
    │ PostgreSQL  │   │  Qdrant (VDB)  │
    │ Port 5432   │   │  Port 6333     │
    │ ┌─────────┐ │   │  Port 6334     │
    │ │laws_raw │ │   │  (gRPC)        │
    │ │law_     │ │   │                │
    │ │changelog│ │   │vietnamese_law  │
    │ │ai_config│ │   │ (Collection)   │
    │ └─────────┘ │   │                │
    └─────────────┘   └────────────────┘
```

## Service Layers

### 1. Frontend (Next.js 14 + TypeScript)

**Responsibility:** Render UI, handle user interactions, format requests

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout, header, nav
│   ├── page.tsx            # Home / contract upload page
│   ├── admin/
│   │   ├── layout.tsx      # Admin layout
│   │   ├── page.tsx        # Admin home
│   │   ├── login/
│   │   │   └── page.tsx    # Admin login form
│   │   ├── crawl/
│   │   │   └── page.tsx    # Law crawl + diff preview
│   │   ├── laws/
│   │   │   └── page.tsx    # Law management
│   │   └── ai-config/
│   │       └── page.tsx    # LLM provider config
│   └── api/                # Next.js route handlers (optional)
│       ├── review.ts       # Forward to FastAPI
│       └── [admin].ts      # Forward to FastAPI
├── components/
│   ├── ui/                 # shadcn/ui components
│   │   └── button.tsx
│   ├── UploadForm.tsx      # Contract upload
│   ├── RiskReport.tsx      # Display risk analysis
│   └── ChatBox.tsx         # Q&A interface
├── lib/
│   ├── utils.ts            # Utility functions
│   └── api-client.ts       # HTTP client for FastAPI
├── styles/
│   └── globals.css         # Global Tailwind styles
└── tsconfig.json           # TypeScript config (strict mode)
```

**Key Characteristics:**
- App Router (React 18 Server Components where possible)
- Tailwind CSS v3 + shadcn/ui for UI
- Client-side state: React hooks (no Redux for MVP)
- API calls to FastAPI backend via fetch/axios

### 2. Backend (FastAPI + Python 3.11)

**Responsibility:** Orchestrate contract analysis, manage knowledge base, handle LLM calls

```
backend/
├── main.py                 # FastAPI app, lifespan, CORS
├── config.py               # Settings from .env (Pydantic)
├── database.py             # AsyncSession factory, engine
├── routers/
│   ├── public.py           # Public endpoints (/api/*)
│   └── admin.py            # Admin endpoints (/admin/*)
├── models/
│   ├── law.py              # LawDocument, LawChunk, AIConfig
│   └── review.py           # ClauseAnalysis, ContractReview, RiskLevel
├── services/               # Business logic (to be implemented)
│   ├── parser.py           # PDF/DOCX parsing (pdfplumber, python-docx)
│   ├── reviewer.py         # Risk detection engine
│   ├── embedder.py         # Chunk + embed via OpenAI/Anthropic
│   ├── crawler.py          # Crawl vbpl.vn (BeautifulSoup4)
│   └── differ.py           # Diff 2 law versions
├── migrations/
│   └── 001-init-schema.sql # DB schema (PostgreSQL)
├── Dockerfile              # Python 3.11-slim, uvicorn
└── requirements.txt        # Dependencies
```

**Key Characteristics:**
- Async-first design (async/await with asyncio)
- Pydantic v2 for request/response validation
- SQLAlchemy 2.0 async ORM for database
- LiteLLM for provider-agnostic LLM calls
- Qdrant async client for vector search
- Structured logging + error handling

### 3. PostgreSQL 16 (Relational Storage)

**Responsibility:** Persist laws, changelog, AI config

**Schema:**
```sql
-- Table: laws_raw
CREATE TABLE laws_raw (
    id UUID PRIMARY KEY,
    law_number VARCHAR NOT NULL,
    law_name VARCHAR NOT NULL,
    applies_to TEXT[],
    priority INTEGER,
    full_text TEXT,
    articles JSONB,
    source_url VARCHAR,
    crawled_at TIMESTAMPTZ,
    embedded BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1
);
CREATE INDEX idx_laws_raw_law_number ON laws_raw(law_number);
CREATE INDEX idx_laws_raw_embedded ON laws_raw(embedded) WHERE embedded = FALSE;

-- Table: law_changelog
CREATE TABLE law_changelog (
    id UUID PRIMARY KEY,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    law_number VARCHAR,
    change_type VARCHAR,  -- 'new', 'amended', 'repealed'
    article_id VARCHAR,
    old_content TEXT,
    new_content TEXT,
    confirmed_by VARCHAR
);

-- Table: ai_config
CREATE TABLE ai_config (
    id UUID PRIMARY KEY,
    llm_model VARCHAR NOT NULL,
    llm_api_key VARCHAR NOT NULL,  -- encrypted
    llm_temperature FLOAT DEFAULT 0.1,
    updated_by VARCHAR,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
CREATE UNIQUE INDEX idx_ai_config_single_active ON ai_config(is_active) WHERE is_active = TRUE;
```

**Design Rationale:**
- laws_raw: Source of truth for law documents + embedding status
- law_changelog: Audit trail for all law updates (compliance)
- ai_config: Current LLM configuration (only 1 active row)
- TIMESTAMPTZ: All timestamps in UTC (timezone-aware)
- JSONB: articles column supports flexible article/clause structure
- Indexes: Fast lookup by law_number, efficient embedded-to-process queries

### 4. Qdrant (Vector Database)

**Responsibility:** Index law chunks, enable semantic similarity search

**Collection: vietnamese_law**

```yaml
# Qdrant Collection Config
name: vietnamese_law
vector_size: 1536        # text-embedding-3-small dimension
distance: Cosine         # Similarity metric
sparse_vectors: null     # Not used in MVP

# Payload schema (metadata for filtering)
payload_schema:
  law_number: keyword    # e.g., "91/2015/QH13"
  law_name: text
  article: keyword       # e.g., "Điều 301"
  clause: keyword        # e.g., "khoản 1"
  applies_to: list       # ["mua_ban", "dich_vu", "all"]
  is_active: bool
  effective_date: text
  source_url: text
```

**Point Format:**
```json
{
  "id": "BLDS_2015_Dieu_301_khoan_1",
  "vector": [0.123, 0.456, ...],  // 1536 dims
  "payload": {
    "law_number": "91/2015/QH13",
    "law_name": "Bộ luật Dân sự 2015",
    "article": "Điều 301",
    "clause": "khoản 1",
    "text": "Điều 301 khoản 1\n...",
    "applies_to": ["mua_ban", "dich_vu", "all"],
    "is_active": true,
    "version": 1,
    "effective_date": "2017-01-01",
    "source_url": "https://vbpl.vn/...",
    "updated_at": "2026-03-20T00:00:00Z"
  }
}
```

**Query Flow:**
1. Admin provides contract type + clause text
2. Backend embeds clause via text-embedding-3-small
3. Backend queries Qdrant: `similarity_search(embedding, top_k=10, filter={"applies_to": contract_type})`
4. Returns ranked list of relevant law chunks
5. Forward to LLM for detailed analysis

### 5. External LLM Services (via LiteLLM)

**Supported Providers:**
- Anthropic (Claude Opus, Sonnet, Haiku)
- OpenAI (GPT-5, GPT-4)
- Google (Gemini)
- DeepSeek, Qwen, MiniMax, Kimi, GLM, etc.

**Integration Pattern:**
```python
from litellm import completion

response = completion(
    model=settings.llm_model,      # e.g., "claude-opus-4-6"
    messages=[{"role": "user", "content": prompt}],
    api_key=settings.llm_api_key,
    temperature=0.1,
    response_format={"type": "json_object"}  # Structured output
)
```

**Configuration:**
- LLM provider: Changeable via admin UI (/admin/ai-config)
- Embedding: Fixed in .env (cannot change without re-embedding Qdrant)

## Data Flow

### Contract Review Flow (Public)

```
1. User uploads contract (PDF/DOCX)
   ↓
2. FastAPI /api/review endpoint
   │
   ├─ Parse in-memory (pdfplumber / python-docx)
   ├─ No disk write
   ├─ Auto-detect contract type (LLM classification)
   │
3. Split into N clauses
   ↓
4. For each clause (parallel):
   ├─ Embed via text-embedding-3-small → vector
   ├─ Query Qdrant → top 10 relevant laws
   ├─ Format prompt with laws + clause
   ├─ Call LLM → risk level + suggestions
   ├─ Return ClauseAnalysis JSON
   │
5. Aggregate results
   ├─ Count CRITICAL, HIGH, MEDIUM, LOW
   ├─ List missing mandatory clauses
   ├─ Overall risk assessment
   │
6. Return ContractReview JSON → Frontend renders
   ↓
7. File bytes garbage collected
   ✓ Zero persistence
```

**Request Payload:**
```json
{
  "file": "<binary PDF/DOCX>",
  "contract_type": "sales"  // optional, auto-detect if omitted
}
```

**Response Payload:**
```json
{
  "contract_type": "sales",
  "clauses": [
    {
      "clause_index": 0,
      "clause_text": "...",
      "risk_level": "HIGH",
      "issues": ["Thiếu điều khoản bảo vệ người mua"],
      "legal_references": ["Điều 301 Luật Thương mại 2005"],
      "suggestion": "Nên bổ sung điều khoản..."
    }
  ],
  "risk_summary": {
    "total_clauses": 5,
    "critical": 0,
    "high": 2,
    "medium": 1,
    "low": 2
  },
  "overall_assessment": "Hợp đồng có một số rủi ro cần cải thiện..."
}
```

### Knowledge Base Update Flow (Admin)

```
1. Admin: POST /admin/crawl with URL
   ↓
2. Backend crawler fetches HTML/PDF
   │
   ├─ Parse content (BeautifulSoup4 / pdfplumber)
   ├─ Extract articles/clauses
   ├─ Store in temp (not yet embedded)
   │
3. Auto-diff vs existing laws_raw
   │
   ├─ Identify: NEW / AMENDED / REPEALED
   ├─ For each changed article: old vs new
   │
4. Return preview JSON to UI
   ↓
5. Admin reviews diff, selects which to apply
   ↓
6. POST /admin/crawl/confirm with selected article IDs
   │
   ├─ Upsert laws_raw (set embedded = FALSE)
   ├─ Insert law_changelog entries
   ├─ Emit event: laws need re-embedding
   │
7. Background job (or manual trigger):
   │
   ├─ Find laws where embedded = FALSE
   ├─ Chunk text by article/clause structure
   ├─ Batch embed (50 chunks per batch)
   ├─ Upsert to Qdrant
   ├─ Update laws_raw: embedded = TRUE
   │
   ✓ Knowledge base updated
```

### Initial Crawl Flow (Admin - One-time)

```
1. Admin: POST /admin/init
   ↓
2. Read SEED_LAWS from config (~30-50 laws)
   ├─ Priority 1: Core (Dân sự, Thương mại, Trọng tài)
   ├─ Priority 2: By type (Lao động, Xây dựng, ATDL)
   ├─ Priority 3: Tố tụng
   │
3. For each law (sequential, respect rate limit):
   ├─ Crawl from vbpl.vn / congbao.chinhphu.vn
   ├─ Delay 2-3s between requests (avoid block)
   ├─ Parse + validate
   ├─ Insert to laws_raw (embedded = FALSE)
   │
4. Once all crawled:
   │
   ├─ Chunk all laws by article/clause
   ├─ Batch embed (50 chunks/batch)
   ├─ Upsert to Qdrant
   ├─ Set laws_raw.embedded = TRUE
   │
5. Post-init validation:
   ├─ Test 10 query samples
   ├─ Verify Qdrant + PostgreSQL consistency
   │
   ✓ KB ready for use (~25-30 min total)
```

## Deployment Topology

### Local Development (docker-compose.yml)

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on:
      postgres: { condition: service_healthy }
      qdrant: { condition: service_healthy }
    environment:
      - DATABASE_URL=postgresql+asyncpg://...
      - QDRANT_URL=http://qdrant:6333
      - EMBED_MODEL=text-embedding-3-small
      - EMBED_API_KEY=${EMBED_API_KEY}

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on:
      - backend

  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U contract_ai"]
      interval: 5s

  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333", "6334:6334"]
    volumes:
      - qdrant_data:/qdrant/storage
      - ./infra/qdrant/config.yaml:/qdrant/config/production.yaml
    healthcheck:
      test: ["CMD-SHELL", "curl http://localhost:6333/health"]
      interval: 5s

volumes:
  postgres_data:
  qdrant_data:
```

### Cloud Deployment (GCP Cloud Run Example)

```
┌─────────────────────────────────────────┐
│  Cloud Load Balancer (HTTPS)            │
└───────────┬─────────────────────────────┘
            │
┌───────────▼──────────────────────────────┐
│  Cloud Run (FastAPI Backend)             │
│  • Auto-scaled (0-100 containers)        │
│  • Stateless (only state in PG + Qdrant) │
│  • Timeout: 60s (default)                │
└───────────┬──────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───▼──────────┐  ┌─▼──────────────┐
│ Cloud SQL    │  │ Compute Engine │
│ (PostgreSQL) │  │ (Qdrant VM)    │
│ Replicas: 3  │  │ Zone: us-cent1 │
└──────────────┘  └────────────────┘

│  Vercel (Next.js Frontend)
│  • CDN globally distributed
│  • Deploy: vercel push
└────────────────────────────────────────
```

## Observability & Monitoring

### Health Checks

**Endpoint:** `GET /health`

```json
{
  "status": "ok",  // "ok" | "degraded" | "error"
  "db": true,      // PostgreSQL ping
  "qdrant": true   // Qdrant /health
}
```

### Logging

- **FastAPI:** Middleware logs all requests (method, path, status, latency)
- **Database:** asyncpg logs connection pool events
- **LLM:** Log prompt + response (for cost tracking, debugging)
- **Structured:** JSON logs for easy parsing

### Future Monitoring
- **APM:** DataDog, New Relic, or Sentry
- **Metrics:** Request rate, latency, error rate per endpoint
- **Alerts:** PagerDuty for critical failures
- **Cost Tracking:** LLM API spend via LiteLLM dashboard

## Security Considerations

### Data at Rest
- PostgreSQL: Encrypted volume (Cloud SQL auto-encrypts)
- Qdrant: Self-hosted (encryption optional via TLS)
- API Keys: Encrypted with Fernet (cryptography library)

### Data in Transit
- HTTPS only (Cloud Load Balancer enforces)
- Internal services: Service-to-service auth (optional mTLS)

### Access Control
- **Public endpoints:** Rate limit 10/min per IP
- **Admin endpoints:** Cookie-based session (8h TTL), SHA-256 key hash
- **Database:** Connection pooling, minimal privileges per user

### Secrets Management
- Dev: `.env` file (never committed)
- Prod: Google Secret Manager / AWS Secrets Manager
- Rotation: Admin can update LLM keys via UI without redeployment

## Performance Characteristics

| Operation | Target | Notes |
|-----------|--------|-------|
| Contract review (p50) | <30s | Depends on clause count, LLM latency |
| Contract review (p99) | <60s | File size limit 10MB |
| Law similarity search | <100ms | Qdrant query, top 10 results |
| LLM inference | 2-10s | Provider-dependent |
| Initial crawl | ~25-30m | ~40-50 laws, with rate limiting |
| DB connection pool | 5-15 | Min 5, max 15 async connections |
| Qdrant index size | ~500MB | For ~100 laws, dim 1536 |

## Disaster Recovery

- **Database Backup:** Automated daily snapshots (Cloud SQL)
- **Qdrant Snapshot:** Manual before major updates
- **Code:** Git repository (GitHub)
- **RTO:** <30 minutes (redeploy infrastructure)
- **RPO:** <1 hour (last backup)

---

**Last Updated:** 2026-03-20
**Next Review:** End of Phase 03 (LLM integration)
