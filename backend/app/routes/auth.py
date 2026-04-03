import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbDep
from app.db.repositories.user_repository import UserRepository
from app.db.tables import User as UserRow
from app.models.api import LoginRequest, RegisterRequest, TokenResponse
from app.services.jwt_auth import create_access_token
from app.services.passwords import hash_password, verify_password

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: DbDep) -> TokenResponse:
    repo = UserRepository(db)
    if repo.find_by_email(body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    pw_hash = hash_password(body.password)
    u = repo.create_user(email=body.email, password_hash=pw_hash)
    token = create_access_token(user_id=u.id, email=str(u.email) if u.email else None)
    return TokenResponse(access_token=token, sub=u.id, email=u.email)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DbDep) -> TokenResponse:
    repo = UserRepository(db)
    u = repo.find_by_email(body.email)
    if not u:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    row = db.get(UserRow, uuid.UUID(u.id))
    if row is None or not verify_password(body.password, row.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(user_id=u.id, email=str(u.email) if u.email else None)
    return TokenResponse(access_token=token, sub=u.id, email=u.email)
