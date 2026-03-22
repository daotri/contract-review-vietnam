"""Full crawl pipeline: crawl → store → chunk → embed → upsert pgvector."""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.chunker import chunk_law_text
from services.crawler import crawl_with_rate_limit
from services.embedder import EmbeddingService
from services.vector_service import VectorService

logger = logging.getLogger(__name__)


async def run_initial_crawl(
    seed_laws: list[dict],
    db_session: AsyncSession,
    vector_service: VectorService,
    embedding_service: EmbeddingService,
) -> dict:
    """Run the full crawl pipeline for all seed laws.

    Returns summary: {crawled, embedded, chunks_total, errors}.
    """
    summary = {"crawled": 0, "embedded": 0, "chunks_total": 0, "errors": []}

    # Sort by priority
    sorted_laws = sorted(seed_laws, key=lambda x: x.get("priority", 99))

    for i, law in enumerate(sorted_laws):
        law_num = law["law_number"]
        logger.info("Processing %d/%d: %s (%s)", i + 1, len(sorted_laws), law_num, law["law_name"])

        try:
            # Check if already crawled and embedded
            result = await db_session.execute(
                text("SELECT id, embedded FROM laws_raw WHERE law_number = :ln"),
                {"ln": law_num},
            )
            existing = result.fetchone()

            if existing and existing.embedded:
                logger.info("Skipping %s — already embedded", law_num)
                summary["crawled"] += 1
                summary["embedded"] += 1
                continue

            # Step 1: Crawl
            if not existing:
                crawled = await crawl_with_rate_limit(law["source_url"])
                if not crawled:
                    summary["errors"].append(f"Failed to crawl {law_num}")
                    continue

                # Save to PostgreSQL
                await db_session.execute(
                    text("""
                        INSERT INTO laws_raw (id, law_number, law_name, applies_to, priority,
                            full_text, articles, source_url, crawled_at, embedded)
                        VALUES (:id, :law_number, :law_name, :applies_to, :priority,
                            :full_text, CAST(:articles AS jsonb), :source_url, :crawled_at, FALSE)
                        ON CONFLICT (law_number) DO UPDATE SET
                            full_text = EXCLUDED.full_text,
                            articles = EXCLUDED.articles,
                            crawled_at = EXCLUDED.crawled_at
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "law_number": law_num,
                        "law_name": law["law_name"],
                        "applies_to": law.get("applies_to", []),
                        "priority": law.get("priority", 99),
                        "full_text": crawled["full_text"],
                        "articles": _to_json(crawled["articles"]),
                        "source_url": law["source_url"],
                        "crawled_at": datetime.now(timezone.utc),
                    },
                )
                await db_session.commit()
                summary["crawled"] += 1
                articles = crawled["articles"]
            else:
                # Already crawled but not embedded — fetch articles from DB
                result = await db_session.execute(
                    text("SELECT articles FROM laws_raw WHERE law_number = :ln"),
                    {"ln": law_num},
                )
                row = result.fetchone()
                articles = row.articles if row else []
                summary["crawled"] += 1

            # Step 2: Chunk
            chunks = chunk_law_text(articles, law)
            if not chunks:
                logger.warning("No chunks generated for %s", law_num)
                continue

            # Step 3: Embed
            texts = [c["text"] for c in chunks]
            vectors = await embedding_service.embed_texts(texts)

            # Step 4: Upsert to pgvector
            await vector_service.batch_upsert(chunks, vectors)
            summary["chunks_total"] += len(chunks)

            # Step 5: Mark as embedded
            await db_session.execute(
                text("UPDATE laws_raw SET embedded = TRUE WHERE law_number = :ln"),
                {"ln": law_num},
            )
            await db_session.commit()
            summary["embedded"] += 1

            logger.info(
                "Done %s: %d chunks embedded. Progress: %d/%d laws",
                law_num, len(chunks), summary["embedded"], len(sorted_laws),
            )

        except Exception as e:
            logger.error("Error processing %s: %s", law_num, e)
            summary["errors"].append(f"{law_num}: {e}")
            await db_session.rollback()

    logger.info("Pipeline complete: %s", summary)
    return summary


def _to_json(articles: list[dict]) -> str:
    """Convert articles list to JSON string for PostgreSQL JSONB."""
    import json
    return json.dumps(articles, ensure_ascii=False)
