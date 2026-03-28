from fastapi import APIRouter, Query

from app.application.dto.provider_dto import ProviderListResponseDTO
from app.application.use_cases.get_providers_for_recommendation import (
    GetProvidersForRecommendationUseCase,
)
from app.infrastructure.repositories.plan_repository import PlanRepository
from app.infrastructure.repositories.provider_repository import ProviderRepository

router = APIRouter()


@router.get("", response_model=ProviderListResponseDTO)
def get_providers(
    plan_id: str = Query(...),
    care_setting: str = Query(...),
) -> ProviderListResponseDTO:
    use_case = GetProvidersForRecommendationUseCase(
        provider_repository=ProviderRepository(),
        plan_repository=PlanRepository(),
    )
    return use_case.execute(plan_id=plan_id, care_setting=care_setting)
