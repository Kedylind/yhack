from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    app_name: str = "Acne Care Navigation API"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"

    mongodb_uri: str = os.get("MONGODB_URI")
    mongodb_db_name: str = "CostCare"

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
