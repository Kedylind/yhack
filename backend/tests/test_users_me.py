"""Integration tests for /api/users/me (JWT + PostgreSQL)."""

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_db_session
from app.db.repositories.user_repository import UserRepository
from app.main import create_app
from app.services.passwords import hash_password


@pytest.fixture
def client_users_me(db_session):
    repo = UserRepository(db_session)
    repo.create_user(
        email="user@example.com",
        password_hash=hash_password("testpass1234"),
    )
    db_session.commit()

    app = create_app()

    def _db():
        yield db_session

    app.dependency_overrides[get_db_session] = _db
    with TestClient(app) as tc:
        login = tc.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "testpass1234"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        yield tc, token
    app.dependency_overrides.clear()


def test_get_users_me_requires_auth() -> None:
    app = create_app()
    with TestClient(app) as client:
        r = client.get("/api/users/me")
    assert r.status_code == 401


def test_get_users_me_returns_profile(client_users_me) -> None:
    tc, token = client_users_me
    r = tc.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["sub"]) == 36  # UUID string
    assert data["email"] == "user@example.com"
    assert data["user_profile"] is None
    assert data["insurance_profile"] is None


def test_patch_users_me_updates_db(client_users_me) -> None:
    tc, token = client_users_me
    r = tc.patch(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "user_profile": {"fullName": "A", "zip": "02101"},
            "insurance_profile": {"carrier": "BCBS", "planName": "PPO"},
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["user_profile"]["fullName"] == "A"
    assert data["user_profile"]["zip"] == "02101"
    assert data["insurance_profile"]["carrier"] == "BCBS"

    r2 = tc.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r2.json()["user_profile"]["zip"] == "02101"


def test_patch_users_me_empty_body_400(client_users_me) -> None:
    tc, token = client_users_me
    r = tc.patch("/api/users/me", headers={"Authorization": f"Bearer {token}"}, json={})
    assert r.status_code == 400
