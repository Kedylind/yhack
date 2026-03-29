from fastapi import APIRouter

from app.config import get_settings

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Includes safe DB hints so you can confirm the API matches import_csv (same Atlas vs local)."""
    s = get_settings()
    uri = s.mongodb_uri
    mode = "atlas" if "mongodb+srv" in uri else ("local" if "localhost" in uri or "127.0.0.1" in uri else "custom")
    return {
        "status": "ok",
        "mongodb_db_name": s.mongodb_db_name,
        "mongodb_connection_mode": mode,
    }
