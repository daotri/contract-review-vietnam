"""Sliding window rate limiter middleware with bounded memory."""

import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Config: path_prefix → (max_requests, window_seconds)
RATE_LIMITS = {
    "/api/review": (10, 60),        # 10 requests per minute
    "/admin/login": (5, 900),       # 5 attempts per 15 minutes
}

MAX_KEYS = 10_000  # Bound memory — evict oldest when exceeded
CLEANUP_INTERVAL = 300  # Run full cleanup every 5 minutes

# In-memory store: {ip_path: [timestamp, ...]}
_requests: dict[str, list[float]] = defaultdict(list)
_last_cleanup: float = 0.0


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Per-IP sliding window rate limiter with bounded memory."""

    async def dispatch(self, request: Request, call_next) -> Response:
        global _last_cleanup
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        now = time.monotonic()

        # Periodic full cleanup to prevent memory leak
        if now - _last_cleanup > CLEANUP_INTERVAL:
            _full_cleanup(now)
            _last_cleanup = now

        for prefix, (max_req, window_sec) in RATE_LIMITS.items():
            if path.startswith(prefix):
                key = f"{client_ip}:{prefix}"

                # Clean expired entries for this key
                _requests[key] = [t for t in _requests[key] if now - t < window_sec]

                if len(_requests[key]) >= max_req:
                    retry_after = int(window_sec - (now - _requests[key][0]))
                    return JSONResponse(
                        status_code=429,
                        content={"error": "Too many requests", "retry_after": retry_after},
                        headers={"Retry-After": str(retry_after)},
                    )

                _requests[key].append(now)
                break

        return await call_next(request)


def _full_cleanup(now: float) -> None:
    """Remove all expired entries and cap total keys."""
    max_window = max(w for _, w in RATE_LIMITS.values())
    expired_keys = [k for k, ts in _requests.items() if not ts or now - ts[-1] > max_window]
    for k in expired_keys:
        del _requests[k]

    # Evict oldest keys if over limit
    if len(_requests) > MAX_KEYS:
        sorted_keys = sorted(_requests.keys(), key=lambda k: _requests[k][-1] if _requests[k] else 0)
        for k in sorted_keys[: len(_requests) - MAX_KEYS]:
            del _requests[k]
