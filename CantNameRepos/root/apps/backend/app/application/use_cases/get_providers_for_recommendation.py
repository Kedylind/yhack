from app.application.dto.provider_dto import ProviderDTO, ProviderListResponseDTO
from app.infrastructure.repositories.plan_repository import PlanRepository
from app.infrastructure.repositories.provider_repository import ProviderRepository


class GetProvidersForRecommendationUseCase:
    def __init__(
        self,
        provider_repository: ProviderRepository,
        plan_repository: PlanRepository,
    ) -> None:
        self.provider_repository = provider_repository
        self.plan_repository = plan_repository

    def execute(self, plan_id: str, care_setting: str) -> ProviderListResponseDTO:
        plan = self.plan_repository.find_by_id(plan_id)
        if not plan:
            return ProviderListResponseDTO(providers=[])

        providers = self.provider_repository.find_by_network_and_care_setting(
            network=plan["network"],
            care_setting=care_setting,
            limit=5,
        )

        return ProviderListResponseDTO(
            providers=[ProviderDTO.model_validate(provider) for provider in providers]
        )
