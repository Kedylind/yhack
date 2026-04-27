from typing import Any

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter()


@router.get("/health")
def health() -> dict[str, Any]:
    s = get_settings()
    db_url = s.database_url
    mode = (
        "railway"
        if "railway" in db_url
        else ("local" if "localhost" in db_url or "127.0.0.1" in db_url else "custom")
    )
    return {
        "status": "ok",
        "db_mode": mode,
        "lava_configured": bool(s.lava_api_key),
    }
