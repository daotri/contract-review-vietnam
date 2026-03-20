# Codebase Summary — Vietnamese Law Contract Review App

**Version:** 1.0
**Date:** 2026-03-20
**Generated:** Via repomix v1.11.1
**Total Files:** 60 files
**Total Tokens:** 215,053
**Total Chars:** 563,303

---

## Directory Structure

```
contract-ai/
├── .claude/                    # Claude Code assistant configuration
│   └── .env.example           # Global environment variables template
│
├── backend/                   # FastAPI backend (Python 3.11)
│   ├── migrations/
│   │   └── 001-init-schema.sql        # Database schema initialization
│   ├── models/
│   │   ├── __init__.py
│   │   ├── law.py                     # LawDocument, LawChunk, AIConfig
│   │   └── review.py                  # ClauseAnalysis, RiskLevel, ContractReview
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── public.py                  # POST /api/review, /api/chat
│   │   └── admin.py                   # /admin/* protected endpoints
│   ├── services/               # Business logic (placeholder)
│   │   └── __init__.py
│   ├── config.py              # Pydantic Settings configuration
│   ├── database.py            # AsyncSession factory, SQLAlchemy engine
│   ├── main.py                # FastAPI app, lifespan, CORS, health check
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # Multi-stage Python 3.11-slim image
│
├── frontend/                  # Next.js 14 frontend (TypeScript)
│   ├── app/
│   │   ├── layout.tsx         # Root layout component
│   │   ├── page.tsx           # Home page (contract upload)
│   │   ├── admin/             # Admin routes (protected)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Admin home
│   │   │   ├── login/
│   │   │   │   └── page.tsx   # Admin login form
│   │   │   ├── crawl/
│   │   │   │   └── page.tsx   # Law crawl + diff preview
│   │   │   ├── laws/
│   │   │   │   └── page.tsx   # Law management
│   │   │   └── ai-config/
│   │   │       └── page.tsx   # LLM provider configuration
│   │   ├── fonts/             # Web fonts (Geist)
│   │   ├── favicon.ico
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   └── ui/
│   │       └── button.tsx     # shadcn/ui button component
│   ├── lib/
│   │   └── utils.ts           # Utility functions
│   ├── .eslintrc.json         # ESLint configuration
│   ├── .gitignore
│   ├── components.json        # shadcn/ui config
│   ├── Dockerfile             # Multi-stage Node.js image
│   ├── next.config.mjs        # Next.js configuration
│   ├── package.json           # Node.js dependencies
│   ├── postcss.config.mjs     # PostCSS (Tailwind) config
│   ├── tsconfig.json          # TypeScript config (strict mode)
│   ├── tailwind.config.ts     # Tailwind CSS v3 config
│   └── README.md              # Frontend setup guide
│
├── infra/                     # Infrastructure configuration
│   └── qdrant/
│       └── config.yaml        # Qdrant vector database configuration
│
├── docs/                      # Project documentation
│   ├── project-overview-pdr.md      # Product requirements & overview
│   ├── system-architecture.md       # System design & data flow
│   ├── code-standards.md            # Code standards for all languages
│   └── codebase-summary.md          # This file
│
├── plans/                     # Development planning & reports
│   └── reports/               # Subagent reports from CI/CD
│
├── .env.example               # Application environment template
├── .gitignore                 # Git ignore rules
├── .repomixignore             # Repomix ignore patterns
├── docker-compose.yml         # Local development orchestration
├── AGENTS.md                  # AI agent coordination guide
├── CLAUDE.md                  # Claude Code instructions
├── contract-review-blueprint.md   # Feature specification (Vietnamese)
└── release-manifest.json      # Release tracking
```

---

## Module Descriptions

### Backend Modules

#### `backend/main.py`
- **Purpose:** FastAPI application entry point
- **Key Components:**
  - `lifespan()`: Async context manager for DB + Qdrant initialization
  - `app`: FastAPI instance with CORS middleware
  - `/health`: Health check endpoint (DB + Qdrant connectivity)
- **Dependencies:** FastAPI, SQLAlchemy, Qdrant client
- **Status:** Phase 01 ✓ Complete

#### `backend/config.py`
- **Purpose:** Application configuration via Pydantic Settings
- **Key Classes:**
  - `Settings`: Reads from `.env`, validates types, provides defaults
- **Key Fields:**
  - Database: `database_url` (PostgreSQL async connection string)
  - Qdrant: `qdrant_url`, `qdrant_grpc_port`
  - Embedding: `embed_model`, `embed_dimension`, `embed_api_key` (fixed)
  - LLM: `llm_model`, `llm_api_key` (changeable via admin UI)
  - Admin: `admin_key_hash`, `session_secret`
  - App: `cors_origins`, `max_file_size`
- **Status:** Phase 01 ✓ Complete

#### `backend/database.py`
- **Purpose:** Async database engine and session factory
- **Key Components:**
  - `engine`: AsyncEngine with connection pooling
  - `async_session`: AsyncSessionMaker for creating sessions
  - `get_db()`: Dependency function for FastAPI routes
- **Configuration:**
  - Pool size: 5, max overflow: 10
  - Echo: False (no SQL logging in production)
- **Status:** Phase 01 ✓ Complete

#### `backend/models/law.py`
- **Purpose:** Pydantic v2 models for law data
- **Key Classes:**
  - `LawDocument`: Vietnamese law document in PostgreSQL
  - `LawChunk`: Chunk of law text for embedding
  - `AIConfig`: AI provider configuration (LLM only, embedding fixed)
- **Type Hints:** Full type safety with `|` unions (Python 3.10+)
- **Status:** Phase 01 ✓ Complete

#### `backend/models/review.py`
- **Purpose:** Pydantic v2 models for contract review responses
- **Key Classes:**
  - `RiskLevel`: Enum (CRITICAL, HIGH, MEDIUM, LOW)
  - `ClauseAnalysis`: Analysis for single contract clause
  - `RiskSummary`: Aggregated risk counts
  - `ContractReview`: Complete review response
- **Status:** Phase 01 ✓ Complete

#### `backend/routers/public.py`
- **Purpose:** Public API endpoints (no authentication)
- **Current Endpoints:**
  - `GET /api/`: Service info
- **Planned Endpoints:**
  - `POST /api/review`: Upload & analyze contract
  - `POST /api/chat`: Q&A about contract
- **Status:** Phase 01 — Skeleton only (body in Phase 03)

#### `backend/routers/admin.py`
- **Purpose:** Admin API endpoints (protected by session auth)
- **Current Endpoints:**
  - `GET /admin/`: Admin status
- **Planned Endpoints:**
  - `POST /admin/login`: Authenticate with admin key
  - `POST /admin/init`: Initial crawl of seed laws
  - `POST /admin/crawl`: Crawl new law, return diff
  - `POST /admin/crawl/confirm`: Apply law updates
  - `GET /admin/laws`: List all laws
  - `PATCH /admin/laws/{id}`: Enable/disable law
  - `GET /admin/ai-config`: View current LLM config
  - `PUT /admin/ai-config`: Update LLM provider/model
  - `POST /admin/ai-config/test`: Test LLM connection
- **Status:** Phase 01 — Skeleton only (body in Phase 04)

#### `backend/services/` (Planned)
- **Purpose:** Business logic layer (to be implemented)
- **Planned Modules:**
  - `parser.py`: PDF/DOCX parsing (pdfplumber, python-docx)
  - `reviewer.py`: Risk detection engine
  - `embedder.py`: Chunk & embed pipeline
  - `crawler.py`: Web crawler for vbpl.vn, congbao.chinhphu.vn
  - `differ.py`: Diff logic for law updates
- **Status:** Phase 02 — In Progress

#### `backend/migrations/001-init-schema.sql`
- **Purpose:** PostgreSQL schema initialization
- **Tables:**
  - `laws_raw`: Law documents with metadata
  - `law_changelog`: Audit trail for law updates
  - `ai_config`: Current LLM configuration
- **Indexes:** law_number, embedded status, single active config
- **Status:** Phase 01 ✓ Complete

### Frontend Modules

#### `frontend/app/layout.tsx`
- **Purpose:** Root layout component
- **Provides:** HTML structure, metadata, global styles
- **Children:** All pages inherit this layout
- **Status:** Phase 01 ✓ Basic structure

#### `frontend/app/page.tsx`
- **Purpose:** Home page (public contract upload)
- **Planned Components:**
  - UploadForm: File input + contract type selector
  - RiskReport: Display analysis results
  - ChatBox: Q&A interface
- **Status:** Phase 01 — Skeleton

#### `frontend/app/admin/` (Planned)
- **Purpose:** Admin dashboard routes
- **Planned Pages:**
  - `login/page.tsx`: Admin authentication
  - `page.tsx`: Admin home dashboard
  - `crawl/page.tsx`: Law crawl + diff preview
  - `laws/page.tsx`: Law management UI
  - `ai-config/page.tsx`: LLM provider configuration
- **Auth:** Cookie-based session (8h TTL)
- **Status:** Phase 04 — In Progress

#### `frontend/components/` (Planned)
- **Purpose:** Reusable UI components
- **Planned Components:**
  - `UploadForm.tsx`: Contract file upload
  - `RiskReport.tsx`: Risk analysis display
  - `ClauseCard.tsx`: Individual clause analysis card
  - `ChatBox.tsx`: Q&A interface
  - `ui/`: shadcn/ui primitives (button, input, dialog, etc.)
- **Status:** Phase 05

#### `frontend/lib/utils.ts`
- **Purpose:** Utility functions
- **Provides:** cn() for Tailwind class merging, format helpers
- **Status:** Phase 01 ✓

#### `frontend/lib/api-client.ts` (Planned)
- **Purpose:** HTTP client for FastAPI backend
- **Methods:**
  - `reviewContract()`: Call /api/review
  - `chatContract()`: Call /api/chat
  - `getAIConfig()`: Call /admin/ai-config
  - `updateAIConfig()`: PUT /admin/ai-config
- **Status:** Phase 03

### Configuration Files

#### `docker-compose.yml`
- **Services:**
  - `backend`: FastAPI on port 8000
  - `frontend`: Next.js on port 3000
  - `postgres`: PostgreSQL 16 on port 5432
  - `qdrant`: Qdrant on ports 6333 (HTTP), 6334 (gRPC)
- **Health Checks:** All services validated before startup
- **Volumes:** postgres_data, qdrant_data (persistent)
- **Status:** Phase 01 ✓ Complete

#### `backend/Dockerfile`
- **Base Image:** python:3.11-slim
- **Build:** pip install requirements
- **Runtime:** uvicorn on port 8000
- **Status:** Phase 01 ✓ Complete

#### `frontend/Dockerfile`
- **Base Image:** node:18-alpine (assumed)
- **Build:** npm install + npm run build
- **Runtime:** npm run dev on port 3000
- **Status:** Phase 01 ✓ Complete

#### `infra/qdrant/config.yaml`
- **Purpose:** Qdrant production configuration
- **Key Settings:**
  - gRPC port: 6334
  - Snapshot storage path
  - Index configuration for vector search
- **Status:** Phase 01 ✓ Basic

#### `.env.example`
- **Purpose:** Template for environment variables
- **Key Variables:**
  - Database credentials
  - Qdrant connection
  - Embedding API configuration
  - LLM configuration
  - Admin authentication
- **Usage:** Copy to `.env`, configure for your deployment
- **Status:** Phase 01 ✓ Complete

---

## Dependency Summary

### Backend (Python)

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.115.0 | Web framework |
| uvicorn | 0.30.6 | ASGI server |
| sqlalchemy | 2.0.35 | ORM + async support |
| asyncpg | 0.29.0 | PostgreSQL async driver |
| pydantic | 2.9.2 | Data validation |
| pydantic-settings | 2.5.2 | Configuration management |
| qdrant-client | 1.11.3 | Vector DB client |
| litellm | 1.48.0 | LLM provider abstraction |
| cryptography | 43.0.1 | API key encryption |
| httpx | 0.27.2 | Async HTTP client |
| python-multipart | 0.0.9 | File upload parsing |

### Frontend (Node.js)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.x | React framework (SSR) |
| react | 18.x | UI library |
| typescript | Latest | Type safety |
| tailwindcss | 3.x | Utility-first CSS |
| shadcn/ui | Latest | Accessible UI components |

---

## Data Flow Summary

### Contract Review (Public)
```
User → Frontend (Upload) → FastAPI /api/review → Parser → Embedder → Qdrant (Search) → LLM → Response → Frontend (Display)
```

### Law Management (Admin)
```
Admin → Frontend (Crawl) → FastAPI /admin/crawl → Crawler → Differ → Preview → Confirm → PostgreSQL + Qdrant (Update)
```

### LLM Configuration (Admin)
```
Admin → Frontend /admin/ai-config → FastAPI PUT /admin/ai-config → PostgreSQL (Update) → Next request uses new config
```

---

## Testing Status

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|-----------|------------------|-----------|
| Backend | Not started | Not started | Not started |
| Frontend | Not started | Not started | Not started |
| Database | N/A | Not started | Not started |

**Note:** Phase 05 includes comprehensive testing suite.

---

## Known Limitations & TODOs

### Phase 02 (In Progress)
- [ ] Implement PDF/DOCX parser (pdfplumber, python-docx)
- [ ] Implement law crawler (vbpl.vn, congbao.chinhphu.vn)
- [ ] Implement chunk + embed pipeline
- [ ] Load initial seed laws into Qdrant
- [ ] Validation: test with 10 sample queries

### Phase 03
- [ ] Integrate LiteLLM for LLM calls
- [ ] Implement risk detection engine
- [ ] Implement legal reference matching
- [ ] Format review response (ClauseAnalysis, ContractReview)
- [ ] Add logging + error handling

### Phase 04
- [ ] Admin UI for law crawl + diff preview
- [ ] Selective law update + changelog
- [ ] AI config endpoint + UI
- [ ] Cookie-based auth for admin

### Phase 05
- [ ] Public UI for contract upload
- [ ] Risk report display (color-coded by risk level)
- [ ] Chat Q&A interface
- [ ] Report export (PDF/Word)
- [ ] Rate limiting
- [ ] Comprehensive testing

### Performance Optimizations (Future)
- [ ] Caching for expensive queries (Redis)
- [ ] Batch processing for law embedding
- [ ] Pagination for large law lists
- [ ] CDN for static assets
- [ ] Database query optimization

### Security Enhancements (Future)
- [ ] OAuth2 for multi-user admin auth
- [ ] Rate limiting per user
- [ ] Audit logging for all admin actions
- [ ] Encryption at rest for sensitive data
- [ ] mTLS for service-to-service communication

---

## File Statistics

| Category | Count | Details |
|----------|-------|---------|
| Python files | ~10 | Backend models, routers, services (planned) |
| TypeScript files | ~15 | Frontend pages, components, lib |
| Configuration | ~10 | Docker, Tailwind, ESLint, tsconfig, etc. |
| Documentation | ~5 | README, blueprints, guides |
| SQL files | 1 | 001-init-schema.sql |
| **Total** | **60** | As of 2026-03-20 |

---

## Build & Deployment Commands

### Local Development
```bash
docker-compose up
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# PostgreSQL: localhost:5432
# Qdrant: http://localhost:6333
```

### Backend Only
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Only
```bash
cd frontend
npm install
npm run dev
```

---

## Code Quality Metrics

- **Type Coverage:** Python 100% (Pydantic validation), TypeScript strict mode enabled
- **Linting:** Backend (future: pylint/flake8), Frontend (ESLint)
- **Testing:** Not started (Phase 05)
- **Documentation:** In progress (Phase 01 docs complete)

---

## Integration Points

### External Services
1. **PostgreSQL 16** — Relational storage for laws, changelog, AI config
2. **Qdrant** — Vector similarity search for law embedding
3. **LLM APIs** — Anthropic, OpenAI, Google, others (via LiteLLM)
4. **Embedding API** — text-embedding-3-small (OpenAI)
5. **Web Crawling** — vbpl.vn, congbao.chinhphu.vn

### Internal APIs
- `/api/review` — Contract analysis
- `/api/chat` — Q&A about contract
- `/admin/*` — Knowledge base + config management
- `/health` — Service health check

---

## Next Steps

1. **Phase 02:** Implement contract parser + law crawler
2. **Phase 03:** Integrate LLM + implement risk detection
3. **Phase 04:** Admin UI for knowledge base management
4. **Phase 05:** Public UI + comprehensive testing
5. **Phase 06:** Performance optimization + cloud deployment

---

**Last Updated:** 2026-03-20
**Repomix Version:** 1.11.1
**Repository:** contract-ai
**Main Branch:** main
