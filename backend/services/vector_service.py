"""PostgreSQL pgvector service — replaces Qdrant for vector storage and similarity search."""

import json
import logging

from sqlalchemy import text

from database import async_session

logger = logging.getLogger(__name__)

UPSERT_BATCH_SIZE = 100


class VectorService:
    """Vector storage and similarity search via PostgreSQL pgvector extension."""

    async def init_collection(self) -> None:
        """No-op: table is created by SQL migration (001-init-schema.sql)."""
        logger.info("VectorService ready — law_chunks table managed by migration")

    async def batch_upsert(self, chunks: list[dict], vectors: list[list[float]]) -> int:
        """Insert or update chunk/vector pairs in law_chunks table.

        Returns number of rows upserted.
        """
        total_upserted = 0

        async with async_session() as db:
            for i in range(0, len(chunks), UPSERT_BATCH_SIZE):
                batch_chunks = chunks[i : i + UPSERT_BATCH_SIZE]
                batch_vectors = vectors[i : i + UPSERT_BATCH_SIZE]

                for chunk, vector in zip(batch_chunks, batch_vectors):
                    # pgvector expects embedding as a string like '[0.1, 0.2, ...]'
                    embedding_str = json.dumps(vector)
                    await db.execute(
                        text("""
                            INSERT INTO law_chunks
                                (chunk_id, law_number, law_name, article, clause, text, applies_to, is_active, embedding)
                            VALUES
                                (:chunk_id, :law_number, :law_name, :article, :clause, :text, :applies_to, TRUE, CAST(:embedding AS vector))
                            ON CONFLICT (chunk_id) DO UPDATE SET
                                law_number = EXCLUDED.law_number,
                                law_name   = EXCLUDED.law_name,
                                article    = EXCLUDED.article,
                                clause     = EXCLUDED.clause,
                                text       = EXCLUDED.text,
                                applies_to = EXCLUDED.applies_to,
                                is_active  = TRUE,
                                embedding  = EXCLUDED.embedding
                        """),
                        {
                            "chunk_id": chunk["chunk_id"],
                            "law_number": chunk["law_number"],
                            "law_name": chunk["law_name"],
                            "article": chunk.get("article", ""),
                            "clause": chunk.get("clause"),
                            "text": chunk["text"],
                            "applies_to": chunk.get("applies_to", []),
                            "embedding": embedding_str,
                        },
                    )
                    total_upserted += 1

                await db.commit()
                logger.info("Upserted batch %d-%d (%d rows)", i, i + len(batch_chunks), len(batch_chunks))

        logger.info("Total upserted: %d rows to law_chunks", total_upserted)
        return total_upserted

    async def search(
        self,
        vector: list[float],
        applies_to: str | None = None,
        law_number: str | None = None,
        limit: int = 5,
    ) -> list[dict]:
        """Search for similar law chunks using cosine distance via pgvector.

        Filters: applies_to (matches array element or 'all'), law_number, is_active.
        """
        embedding_str = json.dumps(vector)

        # Build WHERE clauses dynamically
        conditions = ["is_active = TRUE", "embedding IS NOT NULL"]
        params: dict = {"embedding": embedding_str, "limit": limit}

        if applies_to:
            conditions.append("(applies_to @> ARRAY[:applies_to]::text[] OR 'all' = ANY(applies_to))")
            params["applies_to"] = applies_to

        if law_number:
            conditions.append("law_number = :law_number")
            params["law_number"] = law_number

        where_clause = " AND ".join(conditions)

        sql = text(f"""
            SELECT
                chunk_id, law_number, law_name, article, clause, text,
                1 - (embedding <=> CAST(:embedding AS vector)) AS score
            FROM law_chunks
            WHERE {where_clause}
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
        """)

        async with async_session() as db:
            result = await db.execute(sql, params)
            rows = result.fetchall()

        return [
            {
                "score": float(row.score),
                "chunk_id": row.chunk_id,
                "law_number": row.law_number,
                "law_name": row.law_name,
                "article": row.article or "",
                "clause": row.clause,
                "text": row.text,
            }
            for row in rows
        ]

    async def get_collection_info(self) -> dict:
        """Return row count and status from law_chunks table."""
        try:
            async with async_session() as db:
                result = await db.execute(text("SELECT COUNT(*) AS total FROM law_chunks"))
                row = result.fetchone()
                total = row.total if row else 0
            return {"name": "law_chunks", "points_count": total, "status": "ok"}
        except Exception:
            return {"name": "law_chunks", "points_count": 0, "status": "not_found"}
