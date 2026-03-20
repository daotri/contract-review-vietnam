"""Fernet encryption for API keys stored in PostgreSQL."""

import base64
import hashlib

from cryptography.fernet import Fernet

from config import settings


def _get_fernet() -> Fernet:
    """Derive a Fernet key from SESSION_SECRET."""
    # Fernet needs 32 bytes base64-encoded; derive from session secret
    key_bytes = hashlib.sha256(settings.session_secret.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_api_key(key: str) -> str:
    """Encrypt an API key for storage."""
    if not key:
        return ""
    return _get_fernet().encrypt(key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """Decrypt an API key from storage."""
    if not encrypted:
        return ""
    try:
        return _get_fernet().decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted  # Return as-is if not encrypted (migration case)


def mask_key(key: str) -> str:
    """Mask an API key: show first 4 + last 4 chars."""
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"
