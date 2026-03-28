from app.domain.entities.intake import IntakeAnswers, IntakeRequest
from app.domain.enums.complaint_category import ComplaintCategory
from app.domain.services.red_flag_evaluator import RedFlagEvaluator
from app.infrastructure.loaders.rule_loader import RuleLoader


def make_request(
    facial_swelling: bool = False,
    fever: bool = False,
    rapidly_worsening: bool = False,
) -> IntakeRequest:
    return IntakeRequest(
        zip_code="10001",
        age=25,
        plan_id="acme_hmo_basic",
        category=ComplaintCategory.ACNE,
        answers=IntakeAnswers(
            severity="moderate",
            duration_weeks=3,
            first_time_visit=True,
            wants_cosmetic_treatment=False,
            facial_swelling=facial_swelling,
            fever=fever,
            rapidly_worsening=rapidly_worsening,
            pregnant=False,
        ),
    )


def test_red_flag_evaluator_detects_facial_swelling() -> None:
    evaluator = RedFlagEvaluator(rule_loader=RuleLoader())
    triggered, message = evaluator.evaluate(make_request(facial_swelling=True))
    assert triggered is True
    assert message == "Facial swelling may require urgent in-person evaluation."


def test_red_flag_evaluator_detects_fever_and_worsening() -> None:
    evaluator = RedFlagEvaluator(rule_loader=RuleLoader())
    triggered, message = evaluator.evaluate(
        make_request(fever=True, rapidly_worsening=True)
    )
    assert triggered is True
    assert message == "Fever with rapidly worsening skin symptoms may require urgent evaluation."


def test_red_flag_evaluator_allows_non_red_flag_case() -> None:
    evaluator = RedFlagEvaluator(rule_loader=RuleLoader())
    triggered, message = evaluator.evaluate(make_request())
    assert triggered is False
    assert message is None
