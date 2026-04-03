from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from app.config import get_settings
from app.db.postgres import get_engine

router = APIRouter()


@router.get("/health")
def health() -> dict[str, Any]:
    """Health check with PostgreSQL connectivity and Lava configuration."""
    s = get_settings()
    db_ok = False
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "postgresql",
        "database_connected": db_ok,
        "lava_configured": bool(s.lava_api_key),
    }
