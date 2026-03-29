from fastapi import APIRouter

from app.routes import confirm, estimate, health, hospitals, intake, providers

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(intake.router, prefix="/intake", tags=["intake"])
api_router.include_router(confirm.router, prefix="/confirm", tags=["confirm"])
api_router.include_router(estimate.router, prefix="/estimate", tags=["estimate"])
api_router.include_router(providers.router, prefix="/providers", tags=["providers"])
api_router.include_router(hospitals.router, prefix="/hospitals", tags=["hospitals"])
