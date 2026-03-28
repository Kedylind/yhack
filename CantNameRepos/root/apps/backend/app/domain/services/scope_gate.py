from app.domain.entities.intake import IntakeRequest


class ScopeGateService:
    def is_supported(self, intake: IntakeRequest) -> tuple[bool, str | None]:
        if intake.age < 18:
            return False, "This MVP supports adult users only."

        if intake.category.value != "acne":
            return False, "This MVP currently supports acne concerns only."

        if intake.answers.pregnant:
            return False, "This MVP does not support pregnancy-related care guidance."

        return True, None
