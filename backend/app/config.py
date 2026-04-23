import os
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent


def _default_database_url() -> str:
    """Build a PostgreSQL URL from individual PG* env vars.

    Falls back to DATABASE_URL if set, then to a localhost default for
    local development.  The individual variables are always provided by
    the Railway Postgres service on the private network, so this is the
    most reliable way to construct the connection string in production.
    """
    explicit = os.environ.get("DATABASE_URL", "").strip()
    if explicit:
        return explicit

    host = os.environ.get("PGHOST", "localhost")
    port = os.environ.get("PGPORT", "5432")
    user = os.environ.get("PGUSER", "postgres")
    password = os.environ.get("PGPASSWORD", "postgres")
    database = os.environ.get("PGDATABASE", "carecost")

    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


class Settings(BaseSettings):
    app_name: str = "Boston GI Healthcare Map API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"

    database_url: str = _default_database_url()
    JWT_SECRET_KEY: str = "dev-secret-change-me"
    jwt_access_ttl_minutes: int = 1440
    jwt_issuer: str = "carecost"

    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    lava_api_key: str = ""
    lava_api_base_url: str = "https://api.lava.so/v1"
    lava_gemini_model: str = "gemini-2.5-flash"

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080"
    )

    samples_dir: str = "../data/samples"
    az_data_dir: str = "../data/az-data"

    model_config = SettingsConfigDict(
        env_file=_BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("lava_api_key", mode="before")
    @classmethod
    def strip_lava_api_key(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


def get_settings() -> Settings:
    return Settings()
