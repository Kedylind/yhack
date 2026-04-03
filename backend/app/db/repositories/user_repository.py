from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.user import UserDB
from app.db.tables import User as UserRow


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_id(self, user_id: str) -> UserDB | None:
        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            return None
        row = self.session.get(UserRow, uid)
        if not row:
            return None
        return self._to_model(row)

    def find_by_email(self, email: str) -> UserDB | None:
        row = self.session.scalar(select(UserRow).where(UserRow.email == email.lower()))
        if not row:
            return None
        return self._to_model(row)

    def create_user(
        self,
        *,
        email: str,
        password_hash: str,
        full_name: str | None = None,
    ) -> UserDB:
        now = datetime.now(timezone.utc)
        row = UserRow(
            email=email.lower(),
            password_hash=password_hash,
            full_name=full_name,
            picture=None,
            is_active=True,
            user_profile=None,
            insurance_profile=None,
            created_at=now,
            updated_at=now,
        )
        self.session.add(row)
        self.session.flush()
        return self._to_model(row)

    def patch_profiles(
        self,
        user_id: str,
        *,
        user_profile: dict[str, Any] | None = None,
        insurance_profile: dict[str, Any] | None = None,
    ) -> UserDB | None:
        u = self.find_by_id(user_id)
        if u is None:
            return None
        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            return None
        row = self.session.get(UserRow, uid)
        if not row:
            return None
        now = datetime.now(timezone.utc)
        if user_profile is not None:
            row.user_profile = user_profile
        if insurance_profile is not None:
            row.insurance_profile = insurance_profile
        if user_profile is None and insurance_profile is None:
            return self._to_model(row)
        row.updated_at = now
        self.session.flush()
        return self._to_model(row)

    @staticmethod
    def _to_model(row: UserRow) -> UserDB:
        return UserDB(
            id=str(row.id),
            email=row.email,
            full_name=row.full_name,
            picture=row.picture,
            is_active=row.is_active,
            user_profile=row.user_profile,
            insurance_profile=row.insurance_profile,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
