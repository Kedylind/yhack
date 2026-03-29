from fastapi import APIRouter, HTTPException, status

from app.db.repositories.user_repository import UserRepository
from app.models.api import (
    RegisterRequest,
    LoginRequest,
    AuthTokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service() -> AuthService:
    return AuthService(user_repository=UserRepository())


@router.post("/register", response_model=UserResponse)
def register(payload: RegisterRequest) -> UserResponse:
    try:
        user = get_auth_service().register_user(
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
        )
        return UserResponse(
            id=user.id or "",
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: LoginRequest) -> AuthTokenResponse:
    try:
        token = get_auth_service().login_user(
            email=payload.email,
            password=payload.password,
        )
        return AuthTokenResponse(access_token=token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
