from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Acne Care Navigation API"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "acne_assistant"

    rules_path: str = "seed/rules"
    providers_seed_path: str = "seed/providers.json"
    plans_seed_path: str = "seed/plans.json"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
