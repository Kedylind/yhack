from fastapi import APIRouter

from app.api.v1.endpoints import health, evaluate, providers, plans

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(evaluate.router, prefix="/evaluate", tags=["evaluate"])
api_router.include_router(providers.router, prefix="/providers", tags=["providers"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
