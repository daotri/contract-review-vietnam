"""Admin authentication — SHA-256 key verification and session management."""

import hashlib
import hmac
import secrets
from datetime import datetime, timezone, timedelta

from config import settings

SESSION_TTL_HOURS = 8

# In-memory session store (sufficient for single-instance admin)
_sessions: dict[str, datetime] = {}


def hash_key(key: str) -> str:
    """Hash an admin key with SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()


def verify_admin_key(key: str) -> bool:
    """Verify admin key against stored hash."""
    if not settings.admin_key_hash:
        return False
    return hmac.compare_digest(hash_key(key), settings.admin_key_hash)


def create_session_token() -> str:
    """Create a new session token with expiry."""
    token = secrets.token_hex(32)
    _sessions[token] = datetime.now(timezone.utc)
    _cleanup_expired()
    return token


def verify_session_token(token: str) -> bool:
    """Check if session token exists and is not expired."""
    if token not in _sessions:
        return False

    created_at = _sessions[token]
    if datetime.now(timezone.utc) - created_at > timedelta(hours=SESSION_TTL_HOURS):
        del _sessions[token]
        return False

    return True


def invalidate_session(token: str) -> None:
    """Remove a session token."""
    _sessions.pop(token, None)


def _cleanup_expired() -> None:
    """Remove expired sessions from the store."""
    now = datetime.now(timezone.utc)
    expired = [
        t for t, created in _sessions.items()
        if now - created > timedelta(hours=SESSION_TTL_HOURS)
    ]
    for t in expired:
        del _sessions[t]
