"""Qdrant vector DB service — collection management, upsert, search."""

import logging

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

from config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "vietnamese_law"
UPSERT_BATCH_SIZE = 100


class QdrantService:
    """Async Qdrant client for Vietnamese law embeddings."""

    def __init__(self, client: AsyncQdrantClient):
        self.client = client

    async def init_collection(self) -> None:
        """Create the vietnamese_law collection if it doesn't exist."""
        collections = await self.client.get_collections()
        existing = [c.name for c in collections.collections]

        if COLLECTION_NAME in existing:
            logger.info("Collection '%s' already exists", COLLECTION_NAME)
            return

        await self.client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=settings.embed_dimension,
                distance=Distance.COSINE,
            ),
        )
        logger.info("Created collection '%s' (%d-dim, cosine)", COLLECTION_NAME, settings.embed_dimension)

        # Create payload indexes for filtering
        for field, schema in [
            ("law_number", PayloadSchemaType.KEYWORD),
            ("applies_to", PayloadSchemaType.KEYWORD),
            ("is_active", PayloadSchemaType.BOOL),
            ("article", PayloadSchemaType.KEYWORD),
        ]:
            await self.client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field,
                field_schema=schema,
            )
        logger.info("Created payload indexes on '%s'", COLLECTION_NAME)

    async def batch_upsert(self, chunks: list[dict], vectors: list[list[float]]) -> int:
        """Upsert chunk/vector pairs to Qdrant in batches.

        Returns number of points upserted.
        """
        points = []
        for chunk, vector in zip(chunks, vectors):
            points.append(
                PointStruct(
                    id=chunk["point_id"],
                    vector=vector,
                    payload={
                        "chunk_id": chunk["chunk_id"],
                        "law_number": chunk["law_number"],
                        "law_name": chunk["law_name"],
                        "article": chunk.get("article", ""),
                        "clause": chunk.get("clause"),
                        "text": chunk["text"],
                        "applies_to": chunk.get("applies_to", []),
                        "is_active": True,
                    },
                )
            )

        # Upsert in batches
        total_upserted = 0
        for i in range(0, len(points), UPSERT_BATCH_SIZE):
            batch = points[i : i + UPSERT_BATCH_SIZE]
            await self.client.upsert(collection_name=COLLECTION_NAME, points=batch)
            total_upserted += len(batch)

        logger.info("Upserted %d points to '%s'", total_upserted, COLLECTION_NAME)
        return total_upserted

    async def search(
        self,
        vector: list[float],
        applies_to: str | None = None,
        law_number: str | None = None,
        limit: int = 5,
    ) -> list[dict]:
        """Search for similar law chunks with optional metadata filters."""
        conditions = []
        if applies_to:
            conditions.append(FieldCondition(key="applies_to", match=MatchAny(any=[applies_to, "all"])))
        if law_number:
            conditions.append(FieldCondition(key="law_number", match=MatchValue(value=law_number)))
        conditions.append(FieldCondition(key="is_active", match=MatchValue(value=True)))

        query_filter = Filter(must=conditions) if conditions else None

        results = await self.client.query_points(
            collection_name=COLLECTION_NAME,
            query=vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )

        return [
            {
                "score": point.score,
                "chunk_id": point.payload.get("chunk_id", ""),
                "law_number": point.payload.get("law_number", ""),
                "law_name": point.payload.get("law_name", ""),
                "article": point.payload.get("article", ""),
                "clause": point.payload.get("clause"),
                "text": point.payload.get("text", ""),
            }
            for point in results.points
        ]

    async def get_collection_info(self) -> dict:
        """Get collection stats for health check / admin."""
        try:
            info = await self.client.get_collection(COLLECTION_NAME)
            return {
                "name": COLLECTION_NAME,
                "points_count": info.points_count,
                "vectors_count": info.vectors_count,
                "status": info.status.value,
            }
        except Exception:
            return {"name": COLLECTION_NAME, "points_count": 0, "status": "not_found"}
