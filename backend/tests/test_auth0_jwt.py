import base64
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.services.auth0_jwt import decode_with_jwks_json


def _int_to_b64url(val: int) -> str:
    bl = (val.bit_length() + 7) // 8
    b = val.to_bytes(bl, byteorder="big")
    return base64.urlsafe_b64encode(b).decode("ascii").rstrip("=")


def _rsa_keypair_and_jwks() -> tuple[bytes, dict]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    nums = public_key.public_numbers()
    jwk = {
        "kty": "RSA",
        "kid": "test-kid-1",
        "use": "sig",
        "alg": "RS256",
        "n": _int_to_b64url(nums.n),
        "e": _int_to_b64url(nums.e),
    }
    jwks = {"keys": [jwk]}
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return pem, jwks


def test_decode_with_jwks_json_accepts_valid_token() -> None:
    pem, jwks = _rsa_keypair_and_jwks()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "auth0|abc123",
        "email": "u@example.com",
        "iss": "https://dev-test.auth0.com/",
        "aud": "https://api.example.com",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
    }
    token = jwt.encode(payload, pem, algorithm="RS256", headers={"kid": "test-kid-1"})
    out = decode_with_jwks_json(
        token,
        audience="https://api.example.com",
        issuer="https://dev-test.auth0.com/",
        jwks=jwks,
    )
    assert out["sub"] == "auth0|abc123"
    assert out["email"] == "u@example.com"


def test_decode_with_jwks_json_rejects_wrong_audience() -> None:
    pem, jwks = _rsa_keypair_and_jwks()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "x",
        "iss": "https://dev-test.auth0.com/",
        "aud": "other-audience",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
    }
    token = jwt.encode(payload, pem, algorithm="RS256", headers={"kid": "test-kid-1"})
    with pytest.raises(jwt.InvalidAudienceError):
        decode_with_jwks_json(
            token,
            audience="https://api.example.com",
            issuer="https://dev-test.auth0.com/",
            jwks=jwks,
        )
