from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth_deps import AuthUser, get_current_user_required
from app.api.deps import DbDepAuth
from app.db.repositories.user_repository import UserRepository
from app.models.api import UserMePatch, UserMeResponse

router = APIRouter()


@router.get("/me", response_model=UserMeResponse)
def get_me(
    db: DbDepAuth,
    user: AuthUser = Depends(get_current_user_required),
) -> UserMeResponse:
    repo = UserRepository(db)
    u = repo.find_by_id(user.sub)
    if u is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserMeResponse(
        sub=u.id,
        email=u.email,
        user_profile=u.user_profile,
        insurance_profile=u.insurance_profile,
    )


@router.patch("/me", response_model=UserMeResponse)
def patch_me(
    body: UserMePatch,
    db: DbDepAuth,
    user: AuthUser = Depends(get_current_user_required),
) -> UserMeResponse:
    if body.user_profile is None and body.insurance_profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide user_profile and/or insurance_profile",
        )
    repo = UserRepository(db)
    merged = repo.patch_profiles(
        user.sub,
        user_profile=body.user_profile,
        insurance_profile=body.insurance_profile,
    )
    if merged is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserMeResponse(
        sub=merged.id,
        email=merged.email,
        user_profile=merged.user_profile,
        insurance_profile=merged.insurance_profile,
    )
