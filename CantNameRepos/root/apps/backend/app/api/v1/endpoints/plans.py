from fastapi import APIRouter

from app.infrastructure.db.mongodb import get_database

router = APIRouter()


@router.get("")
def list_plans() -> list[dict]:
    collection = get_database()["plans"]
    return list(collection.find({}, {"_id": 0}))
