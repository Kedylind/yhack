from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of cwd (uvicorn from repo root vs backend/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "CareCost API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/carecost"
    JWT_SECRET_KEY: str = "dev-secret-change-me"
    jwt_issuer: str = "carecost-api"
    jwt_access_ttl_minutes: int = 60

    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    # Lava (https://lava.so): OpenAI-compatible gateway; set LAVA_GEMINI_MODEL to a Gemini id Lava routes (e.g. gemini-2.5-flash).
    # Store only in environment / host secrets — never commit real keys.
    lava_api_key: str = ""
    lava_api_base_url: str = "https://api.lava.so/v1"
    lava_gemini_model: str = "gemini-2.5-flash"

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

    @field_validator("lava_api_key", mode="before")
    @classmethod
    def strip_lava_api_key(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


def get_settings() -> Settings:
    """Fresh Settings each call so edits to backend/.env apply without relying on process cache."""
    return Settings()
