from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserDB(BaseModel):
    id: str | None = None
    auth0_user_id: str
    email: EmailStr | None = None
    full_name: str | None = None
    picture: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
