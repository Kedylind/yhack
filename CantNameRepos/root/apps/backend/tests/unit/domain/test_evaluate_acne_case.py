from app.application.use_cases.evaluate_acne_case import EvaluateAcneCaseUseCase
from app.domain.entities.intake import IntakeAnswers, IntakeRequest
from app.domain.enums.complaint_category import ComplaintCategory
from app.domain.services.scope_gate import ScopeGateService
from app.domain.services.red_flag_evaluator import RedFlagEvaluator
from app.domain.services.recommendation_engine import RecommendationEngine
from app.infrastructure.loaders.rule_loader import RuleLoader


def make_request(
    age: int = 25,
    facial_swelling: bool = False,
    pregnant: bool = False,
    severity: str = "mild",
) -> IntakeRequest:
    return IntakeRequest(
        zip_code="10001",
        age=age,
        plan_id="acme_hmo_basic",
        category=ComplaintCategory.ACNE,
        answers=IntakeAnswers(
            severity=severity,
            duration_weeks=8,
            first_time_visit=True,
            wants_cosmetic_treatment=False,
            facial_swelling=facial_swelling,
            fever=False,
            rapidly_worsening=False,
            pregnant=pregnant,
        ),
    )


def build_use_case() -> EvaluateAcneCaseUseCase:
    loader = RuleLoader()
    return EvaluateAcneCaseUseCase(
        scope_gate=ScopeGateService(),
        red_flag_evaluator=RedFlagEvaluator(rule_loader=loader),
        recommendation_engine=RecommendationEngine(rule_loader=loader),
    )


def test_use_case_returns_unsupported_for_underage() -> None:
    result = build_use_case().execute(make_request(age=17))
    assert result.supported is False
    assert result.recommendations == []


def test_use_case_returns_red_flag_when_present() -> None:
    result = build_use_case().execute(make_request(facial_swelling=True))
    assert result.supported is True
    assert result.red_flag.triggered is True
    assert result.recommendations == []


def test_use_case_returns_recommendations_for_supported_case() -> None:
    result = build_use_case().execute(make_request(severity="mild"))
    assert result.supported is True
    assert result.red_flag.triggered is False
    assert len(result.recommendations) >= 1
