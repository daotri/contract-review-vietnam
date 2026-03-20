# Documentation Index

**Vietnamese Law Contract Review App**
**Version:** 1.0
**Last Updated:** 2026-03-20

---

## Quick Navigation

### For Everyone
- **[Project Overview & PDR](./project-overview-pdr.md)** — Business requirements, features, roadmap
  - What the app does
  - Why we built it this way
  - What success looks like
  - 6-phase development plan

### For Engineers

#### Architecture & Design
- **[System Architecture](./system-architecture.md)** — Technical design, data flow, deployment
  - Service layers (Frontend, Backend, Database, Vector DB)
  - PostgreSQL & Qdrant schemas
  - Contract review flow diagram
  - Law management flow diagram
  - Cloud deployment options

#### Code Standards
- **[Code Standards](./code-standards.md)** — Coding conventions for all languages
  - Backend: Python 3.11 + FastAPI
  - Frontend: TypeScript + Next.js 14
  - SQL standards (PostgreSQL)
  - Docker best practices
  - Git & commit conventions

#### Project Structure
- **[Codebase Summary](./codebase-summary.md)** — Current code inventory & module guide
  - Directory structure (60 files)
  - Module descriptions & status
  - Dependency summary
  - Phase-by-phase roadmap
  - Build & deployment commands

---

## Documentation by Phase

### Phase 01 — Project Setup & Infrastructure ✓ COMPLETE
**Status:** Docs ready

- [x] Project overview & PDR
- [x] System architecture
- [x] Code standards
- [x] Codebase summary
- [x] Docker Compose orchestration
- [x] PostgreSQL schema
- [x] Health checks

**Reference:** See [Project Overview](./project-overview-pdr.md) Phase 01 section

### Phase 02 — Knowledge Base Pipeline (In Progress)
**Status:** Skeleton code ready, docs prepared

**Topics (in codebase-summary.md):**
- Contract parser (PDF/DOCX)
- Law crawler (vbpl.vn)
- Chunking & embedding pipeline
- Qdrant indexing

### Phase 03 — Review Engine (Planned)
**Topics (in system-architecture.md):**
- LLM integration via LiteLLM
- Risk detection engine
- Legal reference matching
- Contract type classification

### Phase 04 — Admin UI (Planned)
**Topics (in system-architecture.md):**
- Knowledge base management UI
- Law crawl & diff preview
- Selective law updates
- AI provider configuration

### Phase 05 — Public UI & Testing (Planned)
**Topics (in code-standards.md testing section):**
- Contract upload UI
- Risk report display
- Chat interface
- Comprehensive test suite

### Phase 06 — Production Hardening (Planned)
**Future docs to create:**
- Deployment guide
- Monitoring & alerting
- Operations runbook
- Security hardening checklist

---

## How to Use This Documentation

### New to the Project?
1. Start with [Project Overview](./project-overview-pdr.md) (business context)
2. Read [System Architecture](./system-architecture.md) (technical overview)
3. Browse [Codebase Summary](./codebase-summary.md) (code structure)
4. Reference [Code Standards](./code-standards.md) when writing code

### Implementing a Feature?
1. Check [Codebase Summary](./codebase-summary.md) for current module status
2. Review [Code Standards](./code-standards.md) for your language
3. Reference [System Architecture](./system-architecture.md) for data flow
4. Follow patterns in existing code

### Deploying to Production?
1. See [System Architecture](./system-architecture.md) Cloud Deployment section
2. Check [Project Overview](./project-overview-pdr.md) Security section
3. Review [Code Standards](./code-standards.md) Docker section
4. *(Future)* See Deployment Guide (Phase 06)

### Debugging an Issue?
1. Check [System Architecture](./system-architecture.md) Data Flow section
2. Review [Code Standards](./code-standards.md) Error Handling section
3. *(Future)* See Troubleshooting Guide (Phase 06)

---

## Key Information at a Glance

### Technology Stack
- **Frontend:** Next.js 14 + TypeScript + Tailwind v3 + shadcn/ui
- **Backend:** FastAPI + Python 3.11 + async SQLAlchemy
- **Database:** PostgreSQL 16 (relational) + Qdrant (vector)
- **LLM:** LiteLLM (provider-agnostic) — supports Claude, GPT, Gemini, etc.
- **Embedding:** text-embedding-3-small (fixed, not changeable via UI)
- **Deployment:** Docker Compose (dev), Cloud Run/ECS (prod)

### Key Files
```
backend/
  ├── main.py                    # FastAPI app entry point
  ├── config.py                  # Settings from .env
  ├── database.py                # AsyncSession + engine
  ├── models/
  │   ├── law.py                 # LawDocument, AIConfig
  │   └── review.py              # ClauseAnalysis, ContractReview
  ├── routers/
  │   ├── public.py              # /api/* endpoints
  │   └── admin.py               # /admin/* endpoints
  ├── services/                  # Business logic (Phase 02+)
  └── migrations/
      └── 001-init-schema.sql    # PostgreSQL schema

frontend/
  ├── app/
  │   ├── page.tsx               # Home (contract upload)
  │   └── admin/                 # Admin dashboard
  ├── components/                # UI components
  └── lib/                        # Utilities & API client

docker-compose.yml               # Local development (4 services)
infra/qdrant/config.yaml         # Qdrant configuration
.env.example                      # Environment template
```

### Core Concepts

**Stateless Design**
- No file storage — contracts exist only in RAM during request
- Complete garbage collection after response
- Privacy-first approach (no history, no tracking)

**Knowledge Base**
- ~100 Vietnamese laws in Qdrant (vector DB)
- Searchable by contract type (sales, labor, construction, etc.)
- Updateable via admin UI with diff preview
- Audit trail in PostgreSQL

**Risk Analysis**
- 5 risk levels: CRITICAL, HIGH, MEDIUM, LOW, OK
- Powered by LLM (configurable provider via UI)
- Matched against law chunks from Qdrant
- Returns clause-by-clause analysis + overall assessment

**Admin Configuration**
- LLM provider: Changeable via UI (instant switch)
- Embedding model: Fixed at deployment (requires re-indexing to change)
- Admin auth: Cookie-based session (8h TTL), SHA-256 key hash

### API Endpoints

**Public** (no auth)
- `POST /api/review` — Analyze contract
- `POST /api/chat` — Q&A about contract
- `GET /health` — Service health

**Admin** (protected by session)
- `POST /admin/login` — Authenticate
- `GET /admin/logout` — End session
- `POST /admin/init` — Initial crawl (~25-30 min)
- `POST /admin/crawl` — Crawl new law
- `POST /admin/crawl/confirm` — Apply updates
- `GET/PATCH /admin/laws` — Manage law list
- `GET/PUT /admin/ai-config` — Configure LLM
- `POST /admin/ai-config/test` — Test connection

---

## Contribution Guidelines

### Before Writing Code
1. Read [Code Standards](./code-standards.md) for your language
2. Check [System Architecture](./system-architecture.md) for data flow
3. Review related modules in [Codebase Summary](./codebase-summary.md)

### Before Committing
1. Follow [Code Standards](./code-standards.md) naming & formatting
2. Add type hints (Python) / strict TypeScript
3. Update docs if changing APIs or data models
4. Run tests (Phase 05+)

### Updating Documentation
1. Keep all doc files < 800 lines (split if needed)
2. Use relative links `[text](./filename.md)`
3. Update "Last Updated" date
4. Add version notes if major change
5. Keep code examples in sync with actual code

---

## Frequently Asked Questions

**Q: Where do I start if I'm new?**
A: Start with [Project Overview](./project-overview-pdr.md), then read [System Architecture](./system-architecture.md).

**Q: How do I add a new law to the knowledge base?**
A: Use the admin UI at `/admin/crawl` to crawl the law from vbpl.vn, preview changes, and confirm. See [System Architecture](./system-architecture.md) Knowledge Base Update Flow.

**Q: Can I change the embedding model?**
A: No — it's fixed at deployment in `.env`. Changing it requires re-embedding all laws in Qdrant (~30 min downtime). See [Project Overview](./project-overview-pdr.md) Constraint section.

**Q: Can I change the LLM provider?**
A: Yes — via `/admin/ai-config` UI. Change takes effect immediately for next request. No redeployment needed.

**Q: How do I run the app locally?**
A: `docker-compose up` from project root. See [Codebase Summary](./codebase-summary.md) Build & Deployment Commands.

**Q: Where's the authentication code?**
A: Phase 04 (admin auth). Phase 01 has schema ready, Phase 04 adds implementation.

**Q: How do I add a new API endpoint?**
A: Add route in `backend/routers/public.py` or `backend/routers/admin.py`, add Pydantic model in `backend/models/`, update [Codebase Summary](./codebase-summary.md) and [System Architecture](./system-architecture.md) API tables.

---

## Document Maintenance

| Document | Last Updated | Next Review | Owner |
|----------|--------------|-------------|-------|
| project-overview-pdr.md | 2026-03-20 | Phase 02 end | Product |
| system-architecture.md | 2026-03-20 | Phase 03 end | Tech Lead |
| code-standards.md | 2026-03-20 | Continuous | Engineering |
| codebase-summary.md | 2026-03-20 | Phase 02 end | Engineering |
| README.md (this file) | 2026-03-20 | Phase 02 end | Docs Manager |

---

## Additional Resources

### External References
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Pydantic v2](https://docs.pydantic.dev/latest/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [LiteLLM Documentation](https://docs.litellm.ai/)

### Project Files
- Specification: [contract-review-blueprint.md](../contract-review-blueprint.md) (Vietnamese)
- Development Plan: [plans/](../plans/) directory
- Configuration: [docker-compose.yml](../docker-compose.yml)
- Code: [backend/](../backend/) and [frontend/](../frontend/)

---

## Support & Questions

**Documentation Issues?**
- Found a typo or unclear section? File an issue or update directly.
- Check if Phase 02+ docs exist for more detail.

**Technical Questions?**
- See [Code Standards](./code-standards.md) for implementation patterns
- Check [System Architecture](./system-architecture.md) for design decisions
- Review [Codebase Summary](./codebase-summary.md) for module details

**Roadmap Questions?**
- See [Project Overview](./project-overview-pdr.md) Development Roadmap
- Check [Codebase Summary](./codebase-summary.md) Phase-by-phase status

---

**Last Updated:** 2026-03-20
**Version:** 1.0
**Status:** Phase 01 Documentation Complete
