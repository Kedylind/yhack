"""Integration tests for /api/users/me (JWT mocked via dependency override)."""

import pytest
from fastapi.testclient import TestClient

from app.api.auth_deps import AuthUser, get_current_user_required
from app.db import mongodb
from app.main import create_app


@pytest.fixture
def client_users_me(monkeypatch, empty_db):
    monkeypatch.setattr(mongodb, "get_database", lambda: empty_db)

    app = create_app()
    app.dependency_overrides[get_current_user_required] = lambda: AuthUser(
        sub="auth0|test-user",
        email="user@example.com",
        claims={
            "sub": "auth0|test-user",
            "email": "user@example.com",
            "name": "Test User",
        },
    )
    with TestClient(app) as tc:
        yield tc
    app.dependency_overrides.clear()


def test_get_users_me_requires_auth() -> None:
    app = create_app()
    with TestClient(app) as client:
        r = client.get("/api/users/me")
    assert r.status_code == 401


def test_get_users_me_returns_profile(client_users_me) -> None:
    r = client_users_me.get("/api/users/me")
    assert r.status_code == 200
    data = r.json()
    assert data["sub"] == "auth0|test-user"
    assert data["email"] == "user@example.com"
    assert data["user_profile"] is None
    assert data["insurance_profile"] is None


def test_patch_users_me_updates_mongo(client_users_me) -> None:
    r = client_users_me.patch(
        "/api/users/me",
        json={
            "user_profile": {"full_name": "A", "zip": "02101"},
            "insurance_profile": {"carrier": "BCBS", "plan_name": "PPO"},
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["user_profile"]["full_name"] == "A"
    assert data["user_profile"]["zip"] == "02101"
    assert data["insurance_profile"]["carrier"] == "BCBS"

    r2 = client_users_me.get("/api/users/me")
    assert r2.json()["user_profile"]["zip"] == "02101"


def test_patch_users_me_empty_body_400(client_users_me) -> None:
    r = client_users_me.patch("/api/users/me", json={})
    assert r.status_code == 400
