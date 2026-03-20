"""Embedding service — async OpenAI batch embedding with rate limiting."""

import asyncio
import logging

from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)

BATCH_DELAY = 0.5  # seconds between batches


class EmbeddingService:
    """Async OpenAI embedding client."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.embed_api_key)
        self.model = settings.embed_model
        self.dimension = settings.embed_dimension

    async def embed_texts(self, texts: list[str], batch_size: int = 50) -> list[list[float]]:
        """Batch embed texts. Returns list of vectors (1536-dim by default)."""
        all_vectors = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(texts) + batch_size - 1) // batch_size

            try:
                response = await self.client.embeddings.create(
                    model=self.model,
                    input=batch,
                    dimensions=self.dimension,
                )
                vectors = [item.embedding for item in response.data]
                all_vectors.extend(vectors)
                logger.info("Embedded batch %d/%d (%d texts)", batch_num, total_batches, len(batch))

            except Exception as e:
                logger.error("Embedding batch %d failed: %s", batch_num, e)
                raise

            # Rate limit between batches
            if i + batch_size < len(texts):
                await asyncio.sleep(BATCH_DELAY)

        return all_vectors

    async def embed_single(self, text: str) -> list[float]:
        """Embed a single text. Used for query embedding."""
        response = await self.client.embeddings.create(
            model=self.model,
            input=[text],
            dimensions=self.dimension,
        )
        return response.data[0].embedding
