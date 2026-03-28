from fastapi import FastAPI
from app.api.router import api_router
from app.infrastructure.config.settings import get_settings

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
