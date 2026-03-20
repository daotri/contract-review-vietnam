# Blueprint: App Review Hợp Đồng theo Luật Việt Nam

> **Phiên bản:** 1.4  
> **Ngày:** 20/03/2026  
> **Loại:** Web App nội bộ — Stateless, không lưu hợp đồng  
> **Thay đổi v1.1:** Thêm phần cấu hình AI Provider (Mục 14)  
> **Thay đổi v1.2:** Bổ sung 4 provider mới: MiniMax, Kimi, Qwen, GLM  
> **Thay đổi v1.3:** Embedding config cố định trong `.env`, không thay đổi qua UI  
> **Thay đổi v1.4:** Model ID là text input tự do — không cần update code khi có model mới

---

## 1. Tổng quan

### Mục tiêu
Xây dựng web app cho phép người dùng upload hợp đồng (PDF/DOCX), hệ thống tự động phân tích rủi ro, kiểm tra tuân thủ pháp luật Việt Nam, gợi ý chỉnh sửa và hỗ trợ hỏi đáp về nội dung hợp đồng.

### Nguyên tắc thiết kế
- **Stateless:** File hợp đồng chỉ tồn tại trong RAM trong suốt 1 request, không lưu vào database
- **Privacy-first:** Không có lịch sử, không có user account, không tracking
- **Separation of concerns:** Public app và Admin app tách biệt hoàn toàn
- **Manual control:** Admin kiểm soát toàn bộ việc cập nhật knowledge base

---

## 2. Kiến trúc hệ thống

```
Internet
    │
    ├──► app.company.com (Public)
    │         ├── Next.js Frontend
    │         └── FastAPI /review
    │
    └──► app.company.com/admin (Admin — yêu cầu key)
              ├── /admin/login
              ├── /admin/init
              ├── /admin/crawl
              └── /admin/laws
```

### Các thành phần

| Component | Công nghệ | Mô tả |
|---|---|---|
| Frontend | Next.js | Giao diện người dùng |
| Backend Public | FastAPI | Xử lý review hợp đồng |
| Backend Admin | FastAPI (cùng app) | Quản lý knowledge base |
| Vector DB | Qdrant | Lưu embeddings văn bản luật VN |
| LLM | **Configurable** (xem Mục 14) | Phân tích rủi ro, sinh gợi ý |
| Embedding | **Configurable** (xem Mục 14) | Embed điều khoản + luật |
| Deploy | Cloud (GCP/AWS/Azure) | Container-based |

---

## 3. Tính năng

### 3.1 Public — Trang check hợp đồng

| Tính năng | Mô tả |
|---|---|
| Upload hợp đồng | Hỗ trợ PDF, DOCX |
| Auto-detect loại HĐ | Mua bán, Lao động, Dịch vụ, Xây dựng... |
| Phát hiện rủi ro | Phân loại CRITICAL / HIGH / MEDIUM / LOW |
| Kiểm tra tuân thủ | Đối chiếu với luật VN hiện hành |
| Gợi ý redline | Đề xuất chỉnh sửa kèm căn cứ pháp lý |
| Hỏi đáp | Chat về nội dung hợp đồng |
| Export kết quả | Tải báo cáo dạng PDF/Word |

### 3.2 Admin — Quản lý knowledge base

| Tính năng | Mô tả |
|---|---|
| Initial crawl | Crawl toàn bộ seed laws lần đầu |
| Trigger crawl | Crawl văn bản mới từ URL hoặc upload file |
| Preview diff | Xem thay đổi trước khi áp dụng |
| Confirm update | Tick chọn điều khoản muốn cập nhật |
| Quản lý luật | Xem danh sách, kích hoạt/vô hiệu hóa |
| **Cấu hình AI** | **Chọn provider, model, nhập API key, test kết nối** |

---

## 4. Luồng xử lý

### 4.1 Review hợp đồng (Public)

```
User upload PDF/DOCX
        ↓
Parse in-memory (không ghi đĩa)
        ↓
Auto-detect loại hợp đồng
        ↓
Tách thành N điều khoản
        ↓
Song song với mỗi điều khoản:
  ├── Embed điều khoản
  ├── Query Qdrant → lấy luật liên quan
  └── Gọi LLM phân tích → ClauseAnalysis
        ↓
Tổng hợp kết quả
        ↓
Trả về JSON → Render UI
        ↓
File bytes garbage collected
(không có gì được lưu lại)
```

### 4.2 Cập nhật luật (Admin)

```
Admin đăng nhập bằng key
        ↓
Nhập URL văn bản mới / upload file
        ↓
Hệ thống crawl + parse
        ↓
Auto-diff với bản cũ trong Qdrant
        ↓
LLM tóm tắt ý nghĩa từng thay đổi
        ↓
Hiển thị danh sách: MỚI / SỬA ĐỔI / BÃI BỎ
        ↓
Admin tick chọn điều khoản muốn áp dụng
        ↓
Confirm → Upsert Qdrant + ghi changelog
```

### 4.3 Initial crawl (Chạy 1 lần duy nhất)

```
Đọc SEED_LAWS (~30-50 văn bản)
        ↓
Crawl theo priority (1 → 2 → 3)
Delay 2-3s/request tránh bị block
        ↓
Parse → lưu raw text vào PostgreSQL
(embedded = false)
        ↓
Chunk theo cấu trúc điều/khoản/điểm
        ↓
Embed theo batch (50 chunks/batch)
        ↓
Upsert vào Qdrant
        ↓
Validation: test 10 query mẫu
        ↓
App sẵn sàng (~25-30 phút)
```

---

## 5. Data Model

### 5.1 Qdrant — Collection `vietnamese_law`

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

### 5.2 PostgreSQL — Bảng `laws_raw`

```sql
CREATE TABLE laws_raw (
    id              UUID PRIMARY KEY,
    law_number      VARCHAR NOT NULL,
    law_name        VARCHAR NOT NULL,
    applies_to      TEXT[],
    priority        INTEGER,
    full_text       TEXT,
    articles        JSONB,
    source_url      VARCHAR,
    crawled_at      TIMESTAMP,
    embedded        BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 1
);
```

### 5.3 PostgreSQL — Bảng `law_changelog`

```sql
CREATE TABLE law_changelog (
    id              UUID PRIMARY KEY,
    changed_at      TIMESTAMP,
    law_number      VARCHAR,
    change_type     VARCHAR,   -- 'new' | 'amended' | 'repealed'
    article_id      VARCHAR,
    old_content     TEXT,
    new_content     TEXT,
    confirmed_by    VARCHAR,
    confirmed_at    TIMESTAMP
);
```

### 5.4 API Response — ClauseAnalysis

```typescript
interface ClauseAnalysis {
  clause_id: string               // "Điều 5.2"
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OK"
  risk_types: Array<
    | "missing_mandatory"         // Thiếu điều khoản bắt buộc
    | "void_clause"               // Vi phạm luật cấm → vô hiệu
    | "ambiguous"                 // Ngôn ngữ mơ hồ
    | "unfair_terms"              // Bất lợi một chiều
    | "missing_protection"        // Thiếu điều khoản bảo vệ
  >
  issues: string[]                // Mô tả cụ thể từng vấn đề
  legal_basis: string[]           // ["Điều 301 Luật TM 2005"]
  suggestion: string              // Gợi ý chỉnh sửa
  suggested_text?: string         // Văn bản đề xuất thay thế
  compliant: boolean
}

interface ContractReview {
  contract_type: string
  applicable_laws: string[]
  risk_summary: {
    CRITICAL: number
    HIGH: number
    MEDIUM: number
    LOW: number
    OK: number
  }
  missing_mandatory_clauses: string[]
  clauses: ClauseAnalysis[]
}
```

---

## 6. Knowledge Base — Seed Laws

### Priority 1 — Nền tảng mọi hợp đồng

| Văn bản | Số hiệu | Áp dụng |
|---|---|---|
| Bộ luật Dân sự 2015 | 91/2015/QH13 | Tất cả |
| Luật Thương mại 2005 | 36/2005/QH11 | Mua bán, đại lý, dịch vụ |
| Luật Trọng tài TM 2010 | 54/2010/QH12 | Tất cả |

### Priority 2 — Theo loại hợp đồng

| Văn bản | Số hiệu | Áp dụng |
|---|---|---|
| Bộ luật Lao động 2019 | 45/2019/QH14 | Lao động |
| NĐ 145/2020 hướng dẫn BLLĐ | 145/2020/NĐ-CP | Lao động |
| Luật Xây dựng 2014 (hợp nhất 2020) | 50/2014/QH13 | Xây dựng |
| NĐ 37/2015 hợp đồng xây dựng | 37/2015/NĐ-CP | Xây dựng |
| NĐ 13/2023 bảo vệ dữ liệu | 13/2023/NĐ-CP | Dịch vụ, công nghệ |

### Priority 3 — Tố tụng & tranh chấp

| Văn bản | Số hiệu | Áp dụng |
|---|---|---|
| Bộ luật Tố tụng Dân sự 2015 | 92/2015/QH13 | Tất cả |

---

## 7. Nguồn crawl

| Nguồn | URL | Độ tin cậy | Ghi chú |
|---|---|---|---|
| CSDL Quốc gia VBPL | vbpl.vn | ⭐⭐⭐⭐⭐ | Nguồn chính thức số 1 |
| Công báo Chính phủ | congbao.chinhphu.vn | ⭐⭐⭐⭐⭐ | Nguồn gốc pháp lý cao nhất |
| Bộ Pháp điển | phapdien.moj.gov.vn | ⭐⭐⭐⭐ | Đã pháp điển hóa |

**Ưu tiên crawl "văn bản hợp nhất"** — đã tích hợp tất cả sửa đổi, tránh phải xử lý nhiều bản.

---

## 8. Bảo mật

### Public app
- Không lưu file hợp đồng
- Không có user session
- Rate limiting: 10 request/IP/phút
- File size limit: 10MB
- Chỉ nhận PDF, DOCX

### Admin app
- Cookie-based session với key hash (SHA-256)
- `httponly: true` — JS không đọc được cookie
- `secure: true` — chỉ qua HTTPS
- `samesite: strict` — chống CSRF
- Session TTL: 8 tiếng
- `ADMIN_KEY` lưu trong Cloud Secret Manager (không hardcode, không commit git)

---

## 9. Cấu trúc project

```
contract-review/
├── docker-compose.yml
├── .env.example
│
├── frontend/                   # Next.js
│   ├── app/
│   │   ├── page.tsx            # Trang upload + review
│   │   └── admin/
│   │       ├── login/page.tsx
│   │       ├── page.tsx        # Admin home
│   │       ├── init/page.tsx
│   │       ├── crawl/page.tsx
│   │       └── laws/page.tsx
│   └── components/
│       ├── UploadForm.tsx
│       ├── RiskReport.tsx
│       ├── ClauseCard.tsx
│       └── ChatBox.tsx
│
├── backend/                    # FastAPI
│   ├── main.py
│   ├── routers/
│   │   ├── public.py           # POST /review
│   │   └── admin.py            # /admin/*
│   ├── services/
│   │   ├── parser.py           # Parse PDF/DOCX in-memory
│   │   ├── reviewer.py         # Risk detection engine
│   │   ├── crawler.py          # Crawl vbpl.vn
│   │   ├── embedder.py         # Chunk + embed
│   │   └── differ.py           # Diff 2 bản luật
│   └── models/
│       ├── review.py           # ClauseAnalysis, ContractReview
│       └── law.py              # LawDocument, LawChunk
│
└── infra/
    ├── docker-compose.yml
    └── qdrant/
        └── config.yaml
```

---

## 10. API Endpoints

### Public

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/review` | Upload và review hợp đồng |
| `POST` | `/chat` | Hỏi đáp về hợp đồng (session trong body) |

### Admin

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/admin/login` | Trang đăng nhập |
| `POST` | `/admin/login` | Xác thực key |
| `GET` | `/admin/logout` | Đăng xuất |
| `GET` | `/admin` | Admin home |
| `POST` | `/admin/init` | Chạy initial crawl |
| `POST` | `/admin/crawl` | Crawl URL mới, trả về preview diff |
| `POST` | `/admin/crawl/confirm` | Confirm áp dụng thay đổi |
| `GET` | `/admin/laws` | Danh sách văn bản hiện có |
| `PATCH` | `/admin/laws/{id}` | Kích hoạt / vô hiệu hóa văn bản |
| `GET` | `/admin/ai-config` | Xem cấu hình AI provider hiện tại |
| `PUT` | `/admin/ai-config` | Cập nhật provider, model, API key |
| `POST` | `/admin/ai-config/test` | Test kết nối provider đang chọn |

---

## 11. Lộ trình phát triển

### Sprint 1 — Tuần 1-2: Knowledge Base
- [ ] Setup Qdrant + schema
- [ ] Viết crawler cho vbpl.vn
- [ ] Pipeline chunk + embed seed laws
- [ ] Validation query KB

### Sprint 2 — Tuần 3-4: Core Review Engine
- [ ] Parser PDF/DOCX in-memory
- [ ] Auto-detect loại hợp đồng
- [ ] Risk detection với structured output
- [ ] Test với 10 hợp đồng mẫu thực tế

### Sprint 3 — Tuần 5: Admin Panel
- [ ] Cookie-based auth
- [ ] UI crawl + preview diff
- [ ] Confirm & update Qdrant
- [ ] **UI cấu hình AI provider + test connection**

### Sprint 4 — Tuần 6: Frontend
- [ ] Upload form
- [ ] Risk report UI (highlight theo màu)
- [ ] Chat Q&A
- [ ] Export PDF/Word

### Sprint 5 — Tuần 7-8: Hoàn thiện
- [ ] Rate limiting
- [ ] Error handling
- [ ] Deploy lên Cloud
- [ ] Test end-to-end

---

## 12. Stack công nghệ

| Layer | Công nghệ | Lý do chọn |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR, dễ deploy |
| Backend | FastAPI + Python 3.11 | Async, type hints, OpenAPI tự động |
| Vector DB | Qdrant | Self-host, filter metadata tốt |
| LLM | Configurable qua UI (xem Mục 14) | Có thể đổi provider không cần redeploy |
| Embedding | Cố định trong `.env` (xem Mục 14.3) | Đặt 1 lần khi init, không đổi qua UI |
| PDF Parse | pdfplumber | Giữ layout tốt hơn PyPDF2 |
| DOCX Parse | python-docx | Chuẩn |
| HTTP Client | httpx (async) | Async-native |
| HTML Parse | BeautifulSoup4 | Đơn giản, đủ dùng |
| SQL DB | PostgreSQL | Lưu raw laws + changelog |
| Deploy | Docker Compose + Cloud Run/ECS | Đơn giản, scale được |

---

## 13. Ước tính chi phí vận hành

Chi phí LLM thay đổi đáng kể tùy provider được chọn:

| Dịch vụ | Ước tính/tháng | Ghi chú |
|---|---|---|
| Cloud Run / ECS | $20-50 | Tùy traffic |
| LLM API (Claude Sonnet 4.6) | $50-200 | ~$0.03-0.08/hợp đồng |
| LLM API (GPT-5 Mini) | $5-30 | ~$0.005-0.01/hợp đồng — rẻ nhất |
| LLM API (DeepSeek V3.2) | $3-15 | Rẻ nhất, chất lượng đủ dùng |
| Embedding API | $2-10 | text-embedding-3-small |
| Qdrant (self-host) | $10-30 | Chạy trên 1 VM nhỏ |
| PostgreSQL | $15-25 | Cloud SQL / RDS |
| **Tổng (Claude Sonnet)** | **~$100-315** | Khuyến nghị cho pháp lý |
| **Tổng (GPT-5 Mini)** | **~$50-145** | Nếu ưu tiên tiết kiệm |

---

## 14. Cấu hình AI Provider

Admin có thể thay đổi LLM provider và model trực tiếp từ trang `/admin/ai-config` mà không cần redeploy app.

---

### 14.1 Providers & Models hỗ trợ

#### 🟣 Anthropic — Claude
> Khuyến nghị cho use case pháp lý: reasoning tốt, ít hallucinate, tiếng Việt ổn định

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| Claude Opus 4.6 ⭐ | `claude-opus-4-6` | Reasoning sâu nhất, phù hợp phân tích pháp lý phức tạp | $5 / $25 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Cân bằng chất lượng/tốc độ, dùng hàng ngày | $3 / $15 |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Nhanh, rẻ, phù hợp detect loại HĐ | $0.25 / $1.25 |

#### 🟢 OpenAI — GPT
> Ecosystem lớn nhất, structured output tốt

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| GPT-5.4 | `gpt-5.4` | Flagship mới nhất, reasoning + coding | $2.50 / $10 |
| GPT-4.1 | `gpt-4.1` | Context window 1M tokens, tốt cho HĐ dài | $2 / $8 |
| GPT-4o | `gpt-4o` | Multimodal, ổn định | $2.50 / $10 |
| GPT-5 Mini | `gpt-5-mini` | Rẻ, phù hợp detect loại HĐ | $0.25 / $2 |
| GPT-5 Nano | `gpt-5-nano` | Rẻ nhất, dùng cho classify đơn giản | $0.05 / $0.40 |

#### 🔵 Google — Gemini
> Context window lớn nhất (1M tokens), free tier rộng rãi

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| Gemini 3.1 Pro | `gemini-3.1-pro` | Mạnh nhất, reasoning tốt | $2 / $12 |
| Gemini 2.5 Pro | `gemini-2.5-pro` | Ổn định, giá hợp lý | $1.25 / $10 |
| Gemini 2.5 Flash | `gemini-2.5-flash` | Nhanh, cân bằng | $0.30 / $2.50 |
| Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | Rẻ nhất trong Gemini | $0.10 / $0.40 |

#### 🟡 xAI — Grok
> Chi phí thấp nhất trong nhóm flagship

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| Grok 4.1 | `grok-4.1` | Rẻ nhất so với cùng tier | $0.20 / $0.50 |

#### 🟠 Groq
> Tốc độ inference nhanh nhất (LPU hardware)

| Model | Model ID | Điểm mạnh | Giá |
|---|---|---|---|
| Llama 4 (via Groq) | `llama-4-scout` | Open source, inference cực nhanh | Rẻ |

#### 🔴 DeepSeek
> Chi phí thấp, phù hợp high-volume

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| DeepSeek V3.2 | `deepseek-chat` | Giá rất thấp, chất lượng ổn | $0.14 / $0.28 |

#### 🟤 MiniMax
> Chi phí rất cạnh tranh, context 1M tokens, open-weight

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| MiniMax M2.7 ⭐ | `minimax/minimax-m2.7` | Mới nhất, SWE-Bench 56%, tự cải thiện | $0.30 / $1.20 |
| MiniMax M2.5 | `minimax/minimax-m2.5` | SWE-Bench 80.2%, tốt cho agentic | $0.30 / $1.20 |
| MiniMax M2 | `minimax/minimax-m2` | Cân bằng, context 197K tokens | $0.255 / $1.00 |

#### 🌙 Kimi (Moonshot AI)
> 1T parameter MoE, giá cạnh tranh, OpenAI-compatible API

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| Kimi K2.5 ⭐ | `moonshotai/kimi-k2.5` | Multimodal native, Agent Swarm, context 256K | $0.60 / $2.50 |
| Kimi K2 Thinking | `moonshotai/kimi-k2-thinking` | Reasoning sâu, long-horizon agent | $0.47 / $2.00 |
| Kimi K2 | `moonshotai/kimi-k2` | Flagship cân bằng, context 131K | $0.55 / $2.20 |
| kimi-latest | `kimi-latest` | Auto-select theo context length | $0.20–$2.00 / $2.00–$5.00 |

#### 🟩 Qwen (Alibaba Cloud)
> Open-weight mạnh, tiếng Trung/Việt tốt, nhiều tier giá

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| Qwen3.5 Plus | `qwen3.5-plus` | Multimodal, context 1M tokens | $0.26 / $1.56 |
| Qwen3 Max | `qwen3-max` | Reasoning + RAG tốt nhất trong Qwen | $0.78 / $3.90 |
| Qwen3 Max Thinking | `qwen3-max-thinking` | Deep reasoning, phù hợp pháp lý phức tạp | ~$1.00 / $5.00 |
| Qwen Plus | `qwen-plus` | Cân bằng chất/giá | $0.40 / $1.20 |
| Qwen Flash | `qwen-flash` | Nhanh, rẻ | $0.065 / $0.26 |
| Qwen Turbo | `qwen-turbo` | Rẻ nhất trong Qwen | $0.065 / $0.26 |

> **Lưu ý Qwen:** API endpoint quốc tế đặt tại Singapore. Một số model có tiered pricing theo số input tokens.

#### 🔷 GLM — Zhipu AI (Z.AI)
> Open-weight, tiếng Trung xuất sắc, có tier miễn phí

| Model | Model ID | Điểm mạnh | Giá (input/output per 1M tokens) |
|---|---|---|---|
| GLM-5 ⭐ | `glm-5` | 744B params, agentic, gần Claude Opus level | $1.00 / $3.20 |
| GLM-4.7 | `glm-4-plus` | Mạnh, open-weight MIT | $0.60 / $2.20 |
| GLM-4.7-Flash | `glm-4-flash` | **Miễn phí**, phù hợp detect loại HĐ | Free |
| GLM-4.5-Flash | `glm-4-airx` | **Miễn phí**, classify đơn giản | Free |

> **Lưu ý GLM:** Truy cập qua `platform.z.ai` (quốc tế) hoặc `open.bigmodel.cn` (Trung Quốc). Flash models miễn phí không giới hạn quota — phù hợp cho tác vụ phân loại.

---

### 14.2 Khuyến nghị chọn model theo use case

| Use case | Provider khuyến nghị | Lý do |
|---|---|---|
| **Review pháp lý phức tạp** | Claude Opus 4.6 hoặc Qwen3 Max Thinking | Reasoning sâu, ít hallucinate |
| **Review hàng ngày** | Claude Sonnet 4.6 hoặc Kimi K2.5 | Cân bằng chất/giá |
| **Auto-detect loại HĐ** | GLM-4.7-Flash (miễn phí!) hoặc GPT-5 Nano | Tác vụ đơn giản, không cần model mạnh |
| **HĐ rất dài (>50 trang)** | MiniMax M2.5 hoặc GPT-4.1 | Context window 1M tokens |
| **Chi phí tối thiểu** | GLM-4.7-Flash (free) hoặc DeepSeek V3.2 | Không mất phí hoặc rất rẻ |
| **Tốc độ tối đa** | Groq (Llama 4) hoặc Kimi K2 Turbo | Inference cực nhanh |
| **Tiếng Việt + tiếng Anh song ngữ** | Qwen3 Max hoặc Claude Sonnet 4.6 | Hỗ trợ đa ngôn ngữ tốt |
| **Hạn chế data ra nước ngoài** | GLM self-host hoặc Qwen self-host | Open-weight, deploy on-premise được |

---

### 14.3 Embedding Model — Cố định, không thay đổi qua UI

> 🔒 **Embedding config được đặt cứng khi khởi tạo app, không expose qua admin UI**

Lý do: mỗi embedding model tạo ra vector trong không gian khác nhau — không thể trộn lẫn. Nếu đổi model, toàn bộ Qdrant phải re-embed lại từ đầu (~30 phút), gây gián đoạn dịch vụ. Vì vậy đây là config hạ tầng, không phải config vận hành hàng ngày.

**Chọn 1 lần khi init, lưu vào `.env`, không bao giờ thay đổi qua UI:**

```bash
# .env
EMBED_MODEL=text-embedding-3-small   # Cố định
EMBED_DIMENSION=1536                 # Cố định
EMBED_API_KEY=sk-...                 # Cố định
```

| Embedding Model | Dimension | Giá per 1M tokens | Ghi chú |
|---|---|---|---|
| `text-embedding-3-small` | 1536 | $0.02 | ✅ Khuyến nghị — rẻ, chất lượng tốt |
| `text-embedding-3-large` | 3072 | $0.13 | Chất lượng cao hơn, đắt hơn |
| `gemini-embedding-001` | 768 | $0.025 | Nếu ưu tiên dùng Google stack |

---

### 14.4 Tích hợp LiteLLM — tự detect provider từ model string

LiteLLM nhận model string và tự biết gọi API nào — không cần khai báo provider riêng. Khi provider ra model mới, chỉ cần nhập model string mới vào UI, không cần sửa code:

```python
# Cài đặt
# pip install litellm

from litellm import completion

# Gọi LLM — chỉ đổi model string là đổi được provider
response = completion(
    model=settings.llm_model,      # Đọc từ DB/env
    messages=[{"role": "user", "content": prompt}],
    api_key=settings.llm_api_key,
    response_format={"type": "json_object"}
)

# Ví dụ model strings:
# "claude-opus-4-6"                    → Anthropic
# "gpt-4.1"                            → OpenAI
# "gemini/gemini-2.5-pro"              → Google
# "xai/grok-4.1"                       → xAI
# "groq/llama-4-scout"                 → Groq
# "deepseek/deepseek-chat"             → DeepSeek
# "openrouter/minimax/minimax-m2.7"    → MiniMax
# "openrouter/moonshotai/kimi-k2.5"    → Kimi (Moonshot)
# "openrouter/qwen/qwen3-max"          → Qwen (Alibaba)
# "openrouter/qwen/qwen3.5-plus-02-15" → Qwen 3.5 Plus
# "openrouter/zai-org/glm-5"           → GLM-5 (Zhipu)
# "openrouter/zai-org/glm-4-flash"     → GLM Flash (free)
```

---

### 14.5 Schema lưu cấu hình AI

Lưu trong PostgreSQL (không lưu trong code/env):

```sql
-- Chỉ lưu LLM config — embedding config đặt trong .env, không thay đổi qua UI
CREATE TABLE ai_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- LLM config (admin có thể thay đổi qua UI)
    llm_model       VARCHAR NOT NULL,   -- model string LiteLLM tự detect provider
                                        -- VD: "claude-opus-4-6", "gpt-4.1",
                                        --     "gemini/gemini-2.5-pro",
                                        --     "openrouter/moonshotai/kimi-k2.5"
    llm_api_key     VARCHAR NOT NULL,   -- encrypted
    llm_temperature FLOAT DEFAULT 0.1,

    -- Metadata
    updated_by      VARCHAR,
    updated_at      TIMESTAMP DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE

    -- Embedding config KHÔNG lưu ở đây
    -- Đặt cứng trong .env: EMBED_MODEL, EMBED_DIMENSION, EMBED_API_KEY
);
```

> API key lưu vào DB phải được **encrypt** (dùng `cryptography.fernet` hoặc Cloud KMS) — không lưu plain text.

---

### 14.6 UI trang `/admin/ai-config`

```
┌──────────────────────────────────────────────────────────┐
│  🤖 Cấu hình AI Provider                                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  LLM — Dùng để phân tích hợp đồng                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │ Model ID  [claude-opus-4-6                    ]    │  │
│  │           💡 Nhập model string theo LiteLLM format │  │
│  │                                                    │  │
│  │ API Key   [sk-ant-••••••••••••••••] [👁 Hiện]       │  │
│  │                                                    │  │
│  │           [🔌 Test kết nối]  ✅ OK — 234ms          │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Tham khảo model ID theo provider:                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Anthropic  claude-opus-4-6                        │  │
│  │            claude-sonnet-4-6                      │  │
│  │            claude-haiku-4-5-20251001              │  │
│  │ OpenAI     gpt-5.4 · gpt-4.1 · gpt-5-mini        │  │
│  │ Google     gemini/gemini-2.5-pro                  │  │
│  │ xAI        xai/grok-4.1                           │  │
│  │ Groq       groq/llama-4-scout                     │  │
│  │ DeepSeek   deepseek/deepseek-chat                 │  │
│  │ MiniMax    openrouter/minimax/minimax-m2.7        │  │
│  │ Kimi       openrouter/moonshotai/kimi-k2.5        │  │
│  │ Qwen       openrouter/qwen/qwen3-max              │  │
│  │ GLM        openrouter/zai-org/glm-5               │  │
│  │            openrouter/zai-org/glm-4-flash (free)  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Embedding — Cố định, không thay đổi qua UI             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🔒 text-embedding-3-small · dim 1536               │  │
│  │    Được đặt trong .env khi khởi tạo hệ thống       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│              [Hủy]              [💾 Lưu cấu hình]       │
└──────────────────────────────────────────────────────────┘
```

---

### 14.7 Backend — `/admin/ai-config`

```python
from pydantic import BaseModel
from litellm import completion
import time, os

# Embedding config đọc từ .env — cố định, không thay đổi qua UI
EMBED_MODEL     = os.getenv("EMBED_MODEL", "text-embedding-3-small")
EMBED_API_KEY   = os.getenv("EMBED_API_KEY")
EMBED_DIMENSION = int(os.getenv("EMBED_DIMENSION", "1536"))

class AIConfigUpdate(BaseModel):
    llm_model:       str    # LiteLLM tự detect provider từ model string
    llm_api_key:     str
    llm_temperature: float = 0.1

@router.get("/admin/ai-config", dependencies=[Depends(verify_session)])
async def get_ai_config():
    config = db.ai_config.find_one({"is_active": True})
    config["llm_api_key"]     = mask_key(config["llm_api_key"])
    config["embed_model"]     = EMBED_MODEL      # read-only, chỉ để hiển thị
    config["embed_dimension"] = EMBED_DIMENSION
    return config

@router.put("/admin/ai-config", dependencies=[Depends(verify_session)])
async def update_ai_config(payload: AIConfigUpdate):
    db.ai_config.update_one(
        {"is_active": True},
        {"$set": {
            "llm_model":       payload.llm_model,
            "llm_api_key":     encrypt(payload.llm_api_key),
            "llm_temperature": payload.llm_temperature,
            "updated_at":      datetime.now()
        }},
        upsert=True
    )
    return {"status": "ok"}

@router.post("/admin/ai-config/test", dependencies=[Depends(verify_session)])
async def test_ai_connection(payload: AIConfigUpdate):
    try:
        start = time.time()
        completion(
            model=payload.llm_model,        # LiteLLM tự biết gọi API nào
            messages=[{"role": "user", "content": "Xin chào"}],
            api_key=payload.llm_api_key,
            max_tokens=10
        )
        return {
            "status": "ok",
            "latency_ms": int((time.time() - start) * 1000)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def mask_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}{'*' * 12}{key[-4:]}"
```

---

### 14.8 Chiến lược đổi LLM

```
Admin vào /admin/ai-config
        ↓
Chọn provider mới + model mới + nhập API key
        ↓
[🔌 Test kết nối] → xác nhận OK
        ↓
[💾 Lưu cấu hình]
        ↓
Áp dụng ngay từ request tiếp theo
Không ảnh hưởng Qdrant, không downtime ✅
```

Embedding config (`EMBED_MODEL`, `EMBED_API_KEY`, `EMBED_DIMENSION`) chỉ thay đổi khi có quyết định hạ tầng — cần re-deploy container và chạy lại toàn bộ embed pipeline (~30 phút). Không làm qua UI.

---

*Blueprint này tổng hợp toàn bộ thiết kế đã thảo luận. Có thể điều chỉnh scope tùy theo nguồn lực và timeline thực tế.*
