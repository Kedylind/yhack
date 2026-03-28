from pymongo import MongoClient
from pymongo.database import Database

from app.config import get_settings

_client: MongoClient | None = None


def get_database() -> Database:
    global _client
    if _client is None:
        settings = get_settings()
        _client = MongoClient(settings.mongodb_uri)
    return _client[get_settings().mongodb_db_name]


def reset_client() -> None:
    """Clear singleton for tests."""
    global _client
    _client = None
