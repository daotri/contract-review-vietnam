"""FastAPI dependencies for auth and DB session injection."""

from fastapi import Cookie, HTTPException, status

from services.auth_service import verify_session_token


async def verify_session(session_token: str = Cookie(default=None)) -> bool:
    """Verify admin session from cookie. Raises 401 if invalid."""
    if not session_token or not verify_session_token(session_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    return True
