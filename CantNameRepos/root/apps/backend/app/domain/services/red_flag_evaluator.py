from app.domain.entities.intake import IntakeRequest
from app.domain.rules.matcher import conditions_match
from app.infrastructure.loaders.rule_loader import RuleLoader


class RedFlagEvaluator:
    def __init__(self, rule_loader: RuleLoader) -> None:
        self.rule_loader = rule_loader

    def evaluate(self, intake: IntakeRequest) -> tuple[bool, str | None]:
        red_flags = self.rule_loader.load_red_flags()
        payload = intake.answers.model_dump()

        for rule in red_flags:
            if rule.category.value != intake.category.value:
                continue

            if conditions_match(payload, rule.conditions):
                return True, rule.message

        return False, None
