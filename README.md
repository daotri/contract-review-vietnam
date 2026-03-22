# Contract AI — Kiểm Tra Hợp Đồng Bằng AI

Ứng dụng kiểm tra hợp đồng tự động dựa trên pháp luật Việt Nam. Hệ thống phân tích rủi ro pháp lý, đối chiếu với 9 bộ luật và đề xuất chỉnh sửa — chỉ trong vài giây.

## Tính năng

- **Phát hiện rủi ro** — Phân loại từng điều khoản theo 4 mức: nghiêm trọng, cao, trung bình, thấp
- **Đối chiếu pháp luật** — So sánh với Bộ luật Dân sự, Luật Thương mại, Luật Lao động, Luật Xây dựng và các nghị định hướng dẫn
- **Đề xuất chỉnh sửa** — AI đề xuất văn bản thay thế kèm căn cứ pháp lý cụ thể
- **Kho luật vector hóa** — 5,300+ điều khoản luật Việt Nam, tìm kiếm ngữ nghĩa qua pgvector
- **Chat trợ lý** — Hỏi đáp trực tiếp về hợp đồng sau khi phân tích
- **Xuất báo cáo** — Tải báo cáo HTML chuyên nghiệp, in ra PDF
- **Admin panel** — Quản lý luật, cấu hình AI, thu thập văn bản pháp luật mới

## Kiến trúc

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Backend    │────▶│   PostgreSQL     │
│  Next.js 14  │     │   FastAPI    │     │   + pgvector     │
│  Tailwind    │     │   LiteLLM    │     │  (law chunks +   │
│  shadcn/ui   │     │   Python     │     │   embeddings)    │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                            │
                     ┌──────▼───────┐
                     │  LLM API     │
                     │  (OpenAI /   │
                     │   Claude)    │
                     └──────────────┘
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.11+, LiteLLM, httpx, BeautifulSoup |
| Database | PostgreSQL 16 + pgvector (HNSW index) |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| LLM | Configurable via admin UI (GPT-4o, Claude, etc.) |
| Crawl | thuvienphapluat.vn (static HTML parsing) |

## Luật được hỗ trợ

| # | Văn bản | Loại HĐ |
|---|---------|---------|
| 1 | Bộ luật Dân sự 2015 | Tất cả |
| 2 | Luật Thương mại 2005 | Mua bán, đại lý, dịch vụ |
| 3 | Luật Trọng tài thương mại 2010 | Tất cả |
| 4 | Bộ luật Lao động 2019 | Lao động |
| 5 | NĐ 145/2020 hướng dẫn BLLĐ | Lao động |
| 6 | Luật Xây dựng 2014 | Xây dựng |
| 7 | NĐ 37/2015 về hợp đồng xây dựng | Xây dựng |
| 8 | NĐ 13/2023 bảo vệ dữ liệu cá nhân | Dịch vụ, công nghệ |
| 9 | Bộ luật Tố tụng Dân sự 2015 | Tất cả |

## Cài đặt

### Yêu cầu

- Docker & Docker Compose
- OpenAI API key (cho embeddings)
- LLM API key (OpenAI hoặc Anthropic)

### 1. Clone và cấu hình

```bash
git clone https://github.com/daotri/contract-review-vietnam.git
cd contract-review-vietnam
cp .env.example .env
```

Chỉnh sửa `.env`:

```env
# Bắt buộc — API key cho embedding
EMBED_API_KEY=sk-...

# Bắt buộc — API key cho LLM (set qua admin UI sau cũng được)
LLM_API_KEY=sk-...

# Bắt buộc — Hash SHA-256 của admin key
# Tạo hash: echo -n "your-secret-key" | sha256sum
ADMIN_KEY_HASH=...

# Bắt buộc — Random secret cho session
# Tạo: openssl rand -hex 32
SESSION_SECRET=...
```

### 2. Khởi động

```bash
docker compose up -d
```

Hệ thống gồm 3 services:
- **postgres** — PostgreSQL 16 + pgvector (port 5432)
- **backend** — FastAPI (port 8000)
- **frontend** — Next.js (port 3000)

### 3. Thu thập luật (lần đầu)

1. Truy cập `http://localhost:3000/admin/login`
2. Đăng nhập bằng admin key (plaintext, không phải hash)
3. Vào **Cấu hình AI** → nhập LLM API key → Lưu
4. Vào **Thu thập ban đầu** → bấm **Bắt đầu**
5. Đợi ~2-3 phút để crawl 9 luật + tạo embeddings

### 4. Sử dụng

1. Truy cập `http://localhost:3000`
2. Bấm **Tải lên hợp đồng** hoặc vào `/review`
3. Upload file PDF/DOCX (tối đa 10MB)
4. Xem kết quả phân tích, chat hỏi đáp, xuất báo cáo

## Cấu trúc thư mục

```
├── backend/
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Environment config
│   ├── database.py             # SQLAlchemy async session
│   ├── seed_laws.py            # 9 seed law definitions
│   ├── migrations/             # SQL schema (auto-run on first start)
│   ├── routers/
│   │   ├── public.py           # /review, /chat endpoints
│   │   └── admin.py            # /admin/* endpoints
│   └── services/
│       ├── crawler.py          # HTML crawler (thuvienphapluat.vn)
│       ├── chunker.py          # Law text chunker (Điều/Khoản/Điểm)
│       ├── embedder.py         # OpenAI embeddings
│       ├── vector_service.py   # pgvector search
│       ├── reviewer.py         # LLM contract review
│       └── crawl_pipeline.py   # Full crawl → embed pipeline
├── frontend/
│   ├── app/                    # Next.js pages
│   │   ├── page.tsx            # Landing page
│   │   ├── review/page.tsx     # Contract review page
│   │   └── admin/              # Admin panel pages
│   ├── components/             # React components
│   └── lib/                    # API clients, types, utils
├── docker-compose.yml          # Dev environment
├── docker-compose.prod.yml     # Production config
└── .env.example                # Environment template
```

## License

MIT
