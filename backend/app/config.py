from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of cwd (uvicorn from repo root vs backend/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "Boston GI Healthcare Map API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "boston_gi_demo"
    JWT_SECRET_KEY: str = "dev-secret-change-me"

    AUTH0_DOMAIN: str = ""
    AUTH0_AUDIENCE: str = ""
    AUTH0_ISSUER: str = ""

    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:8080,http://127.0.0.1:8080"
    )

    samples_dir: str = "../data/samples"
    # MVP: NPI providers + hospital CPT rates (see data/az-data)
    az_data_dir: str = "../data/az-data"

    model_config = SettingsConfigDict(
        env_file=_BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
