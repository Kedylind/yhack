from datetime import datetime
from typing import Any

from bson import ObjectId

from app.db.mongodb import get_database
from app.db.models.user import UserDB


class UserRepository:
    def __init__(self) -> None:
        self.collection = get_database()["users"]

    def find_by_auth0_user_id(self, auth0_user_id: str) -> UserDB | None:
        doc = self.collection.find_one({"auth0_user_id": auth0_user_id})
        if not doc:
            return None
        return self._to_model(doc)

    def find_by_email(self, email: str) -> UserDB | None:
        doc = self.collection.find_one({"email": email.lower()})
        if not doc:
            return None
        return self._to_model(doc)

    def find_by_id(self, user_id: str) -> UserDB | None:
        doc = self.collection.find_one({"_id": ObjectId(user_id)})
        if not doc:
            return None
        return self._to_model(doc)

    def upsert_from_auth0_claims(self, claims: dict) -> UserDB:
        now = datetime.utcnow()

        auth0_user_id = claims["sub"]
        email = claims.get("email")
        full_name = claims.get("name")
        picture = claims.get("picture")

        existing = self.collection.find_one({"auth0_user_id": auth0_user_id})

        if existing:
            self.collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "email": email.lower() if email else None,
                        "full_name": full_name,
                        "picture": picture,
                        "updated_at": now,
                    }
                },
            )
            updated = self.collection.find_one({"_id": existing["_id"]})
            return self._to_model(updated)

        doc: dict[str, Any] = {
            "auth0_user_id": auth0_user_id,
            "email": email.lower() if email else None,
            "full_name": full_name,
            "picture": picture,
            "is_active": True,
            "user_profile": None,
            "insurance_profile": None,
            "created_at": now,
            "updated_at": now,
        }
        result = self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return self._to_model(doc)

    def patch_profiles(
        self,
        auth0_user_id: str,
        *,
        user_profile: dict[str, Any] | None = None,
        insurance_profile: dict[str, Any] | None = None,
    ) -> UserDB | None:
        now = datetime.utcnow()
        updates: dict[str, Any] = {"updated_at": now}
        if user_profile is not None:
            updates["user_profile"] = user_profile
        if insurance_profile is not None:
            updates["insurance_profile"] = insurance_profile
        if len(updates) == 1:
            doc = self.collection.find_one({"auth0_user_id": auth0_user_id})
            return self._to_model(doc) if doc else None
        self.collection.update_one({"auth0_user_id": auth0_user_id}, {"$set": updates})
        doc = self.collection.find_one({"auth0_user_id": auth0_user_id})
        return self._to_model(doc) if doc else None

    @staticmethod
    def _to_model(doc: dict) -> UserDB:
        return UserDB(
            id=str(doc["_id"]),
            auth0_user_id=doc["auth0_user_id"],
            email=doc.get("email"),
            full_name=doc.get("full_name"),
            picture=doc.get("picture"),
            is_active=doc.get("is_active", True),
            user_profile=doc.get("user_profile"),
            insurance_profile=doc.get("insurance_profile"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )
