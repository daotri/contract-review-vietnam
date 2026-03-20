# Vietnamese Law Contract Review App — Project Overview & PDR

**Version:** 1.0
**Date:** 2026-03-20
**Status:** Phase 01 Complete — Infrastructure Ready

## Executive Summary

Vietnamese Law Contract Review App is a **stateless, privacy-first AI platform** for analyzing commercial contracts against Vietnamese law. Users upload PDF/DOCX files, the system identifies legal risks, compliance gaps, and provides remediation recommendations — all without storing files.

**Core Promise:** Fast, accurate contract legal review powered by Claude (configurable LLM) + Vietnamese law knowledge base (Qdrant).

## Product Requirements

### Functional Requirements

#### FR1: Contract Review (Public)
- Accept PDF/DOCX files (max 10MB, stateless upload)
- Auto-detect contract type (e.g., sales, labor, service, construction)
- Analyze each clause against Vietnamese law
- Return risk levels: CRITICAL, HIGH, MEDIUM, LOW, OK
- Provide legal references and remediation suggestions
- Support contract chat Q&A in same session
- Export results (future: PDF/Word report)

**Success Criteria:**
- Process contract in <30s (avg)
- Accuracy rate >85% on test corpus
- Zero file persistence (garbage-collected after request)

#### FR2: Knowledge Base Management (Admin)
- Initial crawl: Ingest 30-50 priority Vietnamese laws (vbpl.vn, congbao.chinhphu.vn)
- Trigger crawl: Add/update law from URL or uploaded file
- Preview diff: Show changes before applying
- Selective apply: Admin tick which clauses to update
- Law management: Enable/disable laws from KB
- Embedded vectors: Auto-chunk and embed via configured embedding model

**Success Criteria:**
- Initial crawl completes in ~25-30 min
- Support >100 laws in Qdrant (no performance regression)
- Diff accuracy >90%

#### FR3: AI Provider Configuration (Admin)
- View current LLM (model ID, version)
- Change provider & model without redeploying
- Manage API keys securely (encrypted in DB)
- Test connection before saving
- Switch providers instantly (next request)

**Success Criteria:**
- 10+ providers supported (Claude, GPT, Gemini, Qwen, etc.)
- Config change takes <5 seconds to apply
- Test connection latency visible to user

### Non-Functional Requirements

#### NFR1: Security & Privacy
- **Stateless design:** No file storage. Contracts exist only in RAM during request lifecycle.
- **Admin authentication:** Cookie-based session with SHA-256 key hash, 8-hour TTL
- **API keys:** Encrypted in PostgreSQL via Fernet (cryptography library)
- **HTTPS only:** secure, httponly, samesite=strict cookies
- **Rate limiting:** 10 requests/IP/min for public endpoints
- **CORS:** Whitelist origin (localhost:3000 in dev, production domain in prod)

#### NFR2: Availability & Performance
- Health check: `/health` endpoint monitors DB + Qdrant connectivity
- Graceful degradation: Continue if Qdrant unavailable (fallback risk classification)
- Response time target: Contract review <30s (avg), <60s (p99)
- Database connection pooling: Min 5, max 15 connections
- Qdrant index: Replica count 1, shard count auto (vector dim 1536)

#### NFR3: Data Integrity
- Schema versioning via migrations (001-init-schema.sql)
- Indexes on `laws_raw.law_number`, `laws_raw.embedded`, `ai_config.is_active`
- Unique constraint: Only 1 active AI config row
- Changelog audit trail: Track all law updates with user + timestamp
- ACID guarantees via PostgreSQL 16 + asyncpg

#### NFR4: Observability
- Structured logging: FastAPI request/response logging
- Health endpoint: Real-time DB + Qdrant status
- Error tracking: Meaningful error messages (no stack traces to client)
- Future: APM integration (DataDog, New Relic)

## Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Frontend | Next.js 14 | 14.x | App Router SSR, built-in API routes, fast deployment |
| Language | TypeScript | Latest | Type safety, IDE support |
| Styling | Tailwind CSS v3 | 3.x | Utility-first, shadcn/ui compatible |
| Components | shadcn/ui | Latest | Accessible, unstyled Radix UI primitives |
| Backend | FastAPI | 0.115.0 | Async-native, Pydantic v2, auto OpenAPI docs |
| Language | Python | 3.11 | Latest stable, excellent ML/data ecosystem |
| ORM | SQLAlchemy 2.0 | 2.0.35 | Async SQLAlchemy, type hints, migration support |
| Database | PostgreSQL | 16 | ACID, JSONB, full-text search, proven at scale |
| Vector DB | Qdrant | Latest | Self-hosted, metadata filtering, Python client |
| LLM Router | LiteLLM | 1.48.0 | Provider-agnostic, auto-detects from model string |
| Embedding | text-embedding-3-small | N/A | Via OpenAI API or compatible (fixed per deployment) |
| Container | Docker Compose | Latest | Local dev + cloud deployment (Cloud Run, ECS) |
| Process Manager | Uvicorn | 0.30.6 | ASGI server, fast, production-ready |

## Architectural Decisions

### Stateless Design
- **Why:** Simplifies scaling, eliminates file storage/cleanup complexity, privacy-compliant
- **How:** Parse PDF/DOCX in-memory, process clauses, return JSON, garbage collect
- **Trade-off:** Cannot implement "saved reviews" without architectural change

### Qdrant + Async SQLAlchemy
- **Why:** Vector similarity for law relevance + ACID relational storage for metadata
- **How:** Qdrant indexes law chunks, PostgreSQL tracks source + changelog
- **Alternative:** Milvus (more complex), Weaviate (heavier), Pinecone (serverless cost)

### LiteLLM for Provider Flexibility
- **Why:** Swap LLM without code changes. Admin sets model string (e.g., "claude-opus-4-6")
- **How:** LiteLLM parses model string, routes to correct API endpoint
- **Constraint:** Embedding model fixed at deployment (cannot change without re-embedding all Qdrant)

### Separate Public / Admin Routers
- **Why:** Clear separation of concerns, easier to rate-limit, audit, and secure
- **How:** `/api/*` (public), `/admin/*` (protected)
- **Future:** Could deploy admin on private network

## Deployment Model

### Local Development
```bash
docker-compose up  # Starts backend, frontend, PostgreSQL, Qdrant
```

### Cloud Deployment (GCP Cloud Run / AWS ECS)
- Backend: Containerized FastAPI + asyncpg connection pool
- Frontend: Next.js deployed to Vercel or Cloud Run
- Database: Cloud SQL (PostgreSQL 16) or RDS
- Qdrant: Self-hosted on VM or Kubernetes
- Docker images: Private registry (Artifact Registry, ECR)

### Configuration via Environment
- `.env` file in docker-compose (dev)
- Cloud Secret Manager (prod)
- Never commit `.env` with real keys

## Data Model Overview

### PostgreSQL: laws_raw
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| law_number | VARCHAR | e.g., "91/2015/QH13" (indexed) |
| law_name | VARCHAR | e.g., "Bộ luật Dân sự 2015" |
| applies_to | TEXT[] | Contract types: ["mua_ban", "dich_vu", "all"] |
| priority | INTEGER | 1 (core), 2 (type-specific), 3 (litigation) |
| full_text | TEXT | Complete law document |
| articles | JSONB | Structured article/clause breakdown |
| source_url | VARCHAR | Origin: vbpl.vn, congbao.chinhphu.vn |
| crawled_at | TIMESTAMPTZ | When fetched |
| embedded | BOOLEAN | True after Qdrant indexed (indexed) |
| version | INTEGER | Incremented on update |

### PostgreSQL: law_changelog
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| changed_at | TIMESTAMPTZ | Update timestamp |
| law_number | VARCHAR | Which law changed |
| change_type | VARCHAR | 'new', 'amended', 'repealed' |
| article_id | VARCHAR | Which article affected |
| old_content | TEXT | Previous version |
| new_content | TEXT | New version |
| confirmed_by | VARCHAR | Admin who approved |

### PostgreSQL: ai_config
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| llm_model | VARCHAR | LiteLLM model string |
| llm_api_key | VARCHAR | Encrypted API key |
| llm_temperature | FLOAT | Model creativity (0.0-1.0) |
| updated_by | VARCHAR | Admin user |
| updated_at | TIMESTAMPTZ | Last config change |
| is_active | BOOLEAN | Only 1 row active |

### Qdrant: vietnamese_law (Collection)
```json
{
  "chunk_id": "BLDS_2015_Dieu_301_khoan_1",
  "law_number": "91/2015/QH13",
  "law_name": "Bộ luật Dân sự 2015",
  "article": "Điều 301",
  "clause": "khoản 1",
  "text": "Điều 301 khoản 1\n[nội dung...]",
  "applies_to": ["mua_ban", "dich_vu", "all"],
  "is_active": true,
  "version": 1,
  "effective_date": "2017-01-01",
  "source_url": "https://vbpl.vn/...",
  "updated_at": "2026-03-20T00:00:00Z"
}
```

**Vector:** text-embedding-3-small (dim=1536)

## API Endpoints

### Public

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/review` | Upload & analyze contract |
| POST | `/api/chat` | Q&A about contract |
| GET | `/health` | Health check |

### Admin (Protected)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin` | Admin home status |
| POST | `/admin/login` | Authenticate with key |
| GET | `/admin/logout` | End session |
| POST | `/admin/init` | Initial crawl of seed laws |
| POST | `/admin/crawl` | Crawl new law, return diff preview |
| POST | `/admin/crawl/confirm` | Apply selected changes |
| GET | `/admin/laws` | List all laws + status |
| PATCH | `/admin/laws/{id}` | Enable/disable law |
| GET | `/admin/ai-config` | Get current LLM config |
| PUT | `/admin/ai-config` | Update LLM provider/model |
| POST | `/admin/ai-config/test` | Test LLM connection |

## Development Roadmap

### Phase 01 ✅ COMPLETE
- [x] PostgreSQL + Qdrant infrastructure
- [x] FastAPI + Next.js boilerplate
- [x] Database schema & migrations
- [x] Docker Compose orchestration
- [x] Health checks & CORS

### Phase 02 (In Progress)
- [ ] Contract parser (PDF/DOCX in-memory)
- [ ] Law crawler (vbpl.vn, congbao.chinhphu.vn)
- [ ] Chunk + embed pipeline
- [ ] Initial seed law load

### Phase 03
- [ ] LLM integration (LiteLLM)
- [ ] Risk detection engine
- [ ] Legal reference matching
- [ ] Response formatting

### Phase 04
- [ ] Admin knowledge base UI
- [ ] Law crawl + diff preview
- [ ] Selective update + changelog
- [ ] AI config endpoint

### Phase 05
- [ ] Public review UI (upload, results, chat)
- [ ] Report export (PDF/Word)
- [ ] Rate limiting + auth
- [ ] End-to-end testing

### Phase 06
- [ ] Performance optimization
- [ ] Cloud deployment
- [ ] Monitoring + alerting
- [ ] Production hardening

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Contract review latency (p50) | <30s | Timing endpoint responses |
| Contract review latency (p99) | <60s | Timing endpoint responses |
| Risk detection accuracy | >85% | Validate against legal expert audit |
| Law KB coverage | >100 laws | Count active laws in Qdrant |
| Uptime | 99.5% | Monitor health check endpoint |
| API error rate | <0.1% | Count 5xx errors |
| User adoption | >50 reviews/week | Track via analytics |

## Security & Compliance Considerations

- **GDPR:** No user accounts, no PII stored, no tracking
- **Data Residency:** Self-hosted Qdrant + PostgreSQL (configurable location)
- **Key Management:** API keys encrypted at rest, never logged
- **Access Control:** Admin session-based auth, 8-hour TTL
- **Audit Trail:** All law updates logged with user + timestamp

## Known Constraints & Future Work

### Current Constraints
- Embedding model fixed at deployment (cannot change without re-embedding)
- Single admin account per deployment (future: multi-user with roles)
- Vietnamese law focus (future: cross-border legal review)
- No real-time collaboration (future: multi-user editing)

### Future Enhancements
- User accounts & saved reviews (breaks stateless promise, adds storage)
- Multi-language support (not just Vietnamese)
- Advanced contract templates + pre-fill
- Workflow automation (send for approval, sign-off tracking)
- Integration with legal CMS (e.g., Notion, Airtable)

## Team & Contact

- **Product Manager:** [To be assigned]
- **Engineering Lead:** [To be assigned]
- **Legal Advisor:** [To be assigned]

---

**Last Updated:** 2026-03-20
**Next Review:** End of Phase 02
