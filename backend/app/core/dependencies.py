from fastapi import HTTPException
from app.core.config import settings


def require_mappls_key() -> str:
    """
    Dependency — raises 503 if MAPPLS_API_KEY is not configured.
    Use this in endpoints that strictly need the MapmyIndia API.
    For diversion we handle missing key with a fallback instead,
    so this dependency is available but optional.
    """
    if not settings.MAPPLS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="MAPPLS_API_KEY is not configured on this server."
        )
    return settings.MAPPLS_API_KEY