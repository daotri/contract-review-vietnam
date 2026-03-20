"""LiteLLM wrapper — reads active LLM config from ai_config DB table with 60s cache."""

import asyncio
import logging
import time

import litellm
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import async_session
from services.crypto_service import decrypt_api_key

logger = logging.getLogger(__name__)

_CACHE_TTL = 60  # seconds


class _ConfigCache:
    """Simple in-memory cache for active AI config."""

    def __init__(self):
        self.model: str = settings.llm_model
        self.api_key: str = settings.llm_api_key
        self.temperature: float = 0.1
        self._fetched_at: float = 0.0
        self._lock = asyncio.Lock()

    def _is_stale(self) -> bool:
        return (time.monotonic() - self._fetched_at) > _CACHE_TTL

    async def get(self) -> tuple[str, str, float]:
        """Return (model, api_key, temperature), refreshing from DB if stale."""
        if not self._is_stale():
            return self.model, self.api_key, self.temperature

        async with self._lock:
            # Double-check after acquiring lock
            if not self._is_stale():
                return self.model, self.api_key, self.temperature

            await self._refresh()
            return self.model, self.api_key, self.temperature

    async def _refresh(self) -> None:
        try:
            async with async_session() as session:
                result = await session.execute(
                    text(
                        "SELECT llm_model, llm_api_key, llm_temperature "
                        "FROM ai_config WHERE is_active = TRUE "
                        "ORDER BY updated_at DESC NULLS LAST LIMIT 1"
                    )
                )
                row = result.fetchone()
                if row:
                    self.model = row[0]
                    self.api_key = decrypt_api_key(row[1])
                    self.temperature = float(row[2])
                    logger.info("LLM config refreshed from DB: model=%s", self.model)
                else:
                    logger.warning("No active ai_config row found; using env defaults")
        except Exception as exc:
            logger.error("Failed to refresh LLM config from DB: %s", exc)
        finally:
            self._fetched_at = time.monotonic()


_cache = _ConfigCache()


class LLMService:
    """Async LiteLLM client with config sourced from DB."""

    async def complete(
        self,
        messages: list[dict],
        response_format: dict | None = None,
        temperature: float | None = None,
    ) -> str:
        """Call LLM and return response text.

        Raises RuntimeError on LLM provider errors.
        """
        model, api_key, temp = await _cache.get()
        effective_temp = temperature if temperature is not None else temp

        kwargs: dict = {
            "model": model,
            "messages": messages,
            "temperature": effective_temp,
            "api_key": api_key or None,
        }
        if response_format:
            kwargs["response_format"] = response_format

        try:
            response = await litellm.acompletion(**kwargs)
            return response.choices[0].message.content or ""
        except litellm.RateLimitError as exc:
            logger.error("LLM rate limit: %s", exc)
            raise RuntimeError("LLM rate limit exceeded. Please retry later.") from exc
        except litellm.AuthenticationError as exc:
            logger.error("LLM auth error: %s", exc)
            raise RuntimeError("LLM authentication failed. Check API key.") from exc
        except Exception as exc:
            logger.error("LLM API error: %s", exc)
            raise RuntimeError(f"LLM request failed: {exc}") from exc


# Module-level singleton
llm_service = LLMService()
