from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Boston GI Healthcare Map API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "boston_gi_demo"

    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    samples_dir: str = "../data/samples"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
