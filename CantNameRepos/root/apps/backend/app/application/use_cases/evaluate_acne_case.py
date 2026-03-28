from app.application.dto.result_dto import EvaluationResultDTO, RedFlagResult
from app.domain.entities.intake import IntakeRequest
from app.domain.services.scope_gate import ScopeGateService
from app.domain.services.red_flag_evaluator import RedFlagEvaluator
from app.domain.services.recommendation_engine import RecommendationEngine


class EvaluateAcneCaseUseCase:
    def __init__(
        self,
        scope_gate: ScopeGateService,
        red_flag_evaluator: RedFlagEvaluator,
        recommendation_engine: RecommendationEngine,
    ) -> None:
        self.scope_gate = scope_gate
        self.red_flag_evaluator = red_flag_evaluator
        self.recommendation_engine = recommendation_engine

    def execute(self, intake: IntakeRequest) -> EvaluationResultDTO:
        supported, support_message = self.scope_gate.is_supported(intake)
        if not supported:
            return EvaluationResultDTO(
                supported=False,
                red_flag=RedFlagResult(triggered=False, message=support_message),
                recommendations=[],
                assumptions=[],
            )

        triggered, red_flag_message = self.red_flag_evaluator.evaluate(intake)
        if triggered:
            return EvaluationResultDTO(
                supported=True,
                red_flag=RedFlagResult(triggered=True, message=red_flag_message),
                recommendations=[],
                assumptions=[],
            )

        recommendations = self.recommendation_engine.recommend(intake)

        assumptions = [
            "For adult non-urgent acne concerns only.",
            "Estimates assume in-network care.",
            "Cosmetic procedures and medication costs may not be included.",
        ]

        return EvaluationResultDTO(
            supported=True,
            red_flag=RedFlagResult(triggered=False),
            recommendations=recommendations,
            assumptions=assumptions,
        )
