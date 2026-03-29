from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr


class UserDB(BaseModel):
    id: str | None = None
    auth0_user_id: str
    email: EmailStr | None = None
    full_name: str | None = None
    picture: str | None = None
    is_active: bool = True
    user_profile: dict[str, Any] | None = None
    insurance_profile: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
