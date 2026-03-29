"""Auth0 RS256 access token verification (JWKS)."""

from __future__ import annotations

import json
import logging
from typing import Any

import jwt
from jwt import PyJWKClient

logger = logging.getLogger(__name__)


def decode_with_jwks_json(
    token: str,
    *,
    audience: str,
    issuer: str,
    jwks: dict[str, Any],
) -> dict[str, Any]:
    """Verify token against an in-memory JWKS (unit tests; no network)."""
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    if not kid or "keys" not in jwks:
        raise jwt.InvalidTokenError("missing kid or keys")
    key_data = next((k for k in jwks["keys"] if k.get("kid") == kid), None)
    if not key_data:
        raise jwt.InvalidTokenError("signing key not in JWKS")
    pub = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))
    return jwt.decode(
        token,
        pub,
        algorithms=["RS256"],
        audience=audience,
        issuer=issuer,
    )


def decode_auth0_access_token(
    token: str,
    *,
    audience: str,
    issuer: str,
    domain: str,
) -> dict[str, Any]:
    """Verify access token using Auth0 JWKS (HTTPS fetch, cached by PyJWKClient)."""
    jwks_uri = f"https://{domain}/.well-known/jwks.json"
    jwks_client = PyJWKClient(jwks_uri, cache_keys=True)
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=audience,
        issuer=issuer,
    )
