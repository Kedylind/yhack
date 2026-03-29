"""FastAPI dependencies for Auth0 JWT (Bearer access tokens)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings
from app.services.auth0_jwt import decode_auth0_access_token

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    sub: str
    email: str | None
    claims: dict[str, Any]


def _require_auth0_config() -> tuple[str, str, str]:
    s = get_settings()
    if not (s.AUTH0_DOMAIN and s.AUTH0_AUDIENCE and s.AUTH0_ISSUER):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth0 is not configured (set AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_ISSUER)",
        )
    return s.AUTH0_DOMAIN, s.AUTH0_AUDIENCE, s.AUTH0_ISSUER


def get_current_user_optional(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser | None:
    if creds is None or not creds.credentials:
        return None
    domain, audience, issuer = _require_auth0_config()
    try:
        claims = decode_auth0_access_token(
            creds.credentials,
            audience=audience,
            issuer=issuer,
            domain=domain,
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub",
        )
    return AuthUser(sub=str(sub), email=claims.get("email"), claims=dict(claims))


def get_current_user_required(
    user: AuthUser | None = Depends(get_current_user_optional),
) -> AuthUser:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user
