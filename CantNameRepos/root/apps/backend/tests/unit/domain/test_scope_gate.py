from app.domain.entities.intake import IntakeAnswers, IntakeRequest
from app.domain.enums.complaint_category import ComplaintCategory
from app.domain.services.scope_gate import ScopeGateService


def make_request(age: int = 25, pregnant: bool = False) -> IntakeRequest:
    return IntakeRequest(
        zip_code="10001",
        age=age,
        plan_id="acme_hmo_basic",
        category=ComplaintCategory.ACNE,
        answers=IntakeAnswers(
            severity="mild",
            duration_weeks=4,
            first_time_visit=True,
            wants_cosmetic_treatment=False,
            facial_swelling=False,
            fever=False,
            rapidly_worsening=False,
            pregnant=pregnant,
        ),
    )


def test_scope_gate_allows_supported_adult_acne_case() -> None:
    service = ScopeGateService()
    supported, message = service.is_supported(make_request())
    assert supported is True
    assert message is None


def test_scope_gate_blocks_under_18() -> None:
    service = ScopeGateService()
    supported, message = service.is_supported(make_request(age=17))
    assert supported is False
    assert message == "This MVP supports adult users only."


def test_scope_gate_blocks_pregnancy() -> None:
    service = ScopeGateService()
    supported, message = service.is_supported(make_request(pregnant=True))
    assert supported is False
    assert message == "This MVP does not support pregnancy-related care guidance."
