from app.domain.entities.intake import IntakeAnswers, IntakeRequest
from app.domain.enums.complaint_category import ComplaintCategory
from app.domain.services.recommendation_engine import RecommendationEngine
from app.infrastructure.loaders.rule_loader import RuleLoader


def make_request(
    severity: str = "mild",
    first_time_visit: bool = True,
    wants_cosmetic_treatment: bool = False,
) -> IntakeRequest:
    return IntakeRequest(
        zip_code="10001",
        age=25,
        plan_id="acme_hmo_basic",
        category=ComplaintCategory.ACNE,
        answers=IntakeAnswers(
            severity=severity,
            duration_weeks=6,
            first_time_visit=first_time_visit,
            wants_cosmetic_treatment=wants_cosmetic_treatment,
            facial_swelling=False,
            fever=False,
            rapidly_worsening=False,
            pregnant=False,
        ),
    )


def test_recommendation_engine_returns_ranked_recommendations_for_mild_acne() -> None:
    engine = RecommendationEngine(rule_loader=RuleLoader())
    recommendations = engine.recommend(make_request())

    assert len(recommendations) >= 1
    assert recommendations[0].care_setting.value == "telederm"
    assert recommendations[0].bundles[0].id == "bundle_telederm_acne_consult"


def test_recommendation_engine_prioritizes_dermatology_for_moderate_acne() -> None:
    engine = RecommendationEngine(rule_loader=RuleLoader())
    recommendations = engine.recommend(make_request(severity="moderate"))

    assert len(recommendations) >= 1
    assert recommendations[0].care_setting.value == "dermatology"


def test_recommendation_engine_prioritizes_cosmetic_derm_for_cosmetic_goal() -> None:
    engine = RecommendationEngine(rule_loader=RuleLoader())
    recommendations = engine.recommend(make_request(wants_cosmetic_treatment=True))

    assert len(recommendations) >= 1
    assert recommendations[0].care_setting.value == "cosmetic_derm"
