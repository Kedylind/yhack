from app.domain.entities.intake import IntakeRequest
from app.domain.entities.cost_bundle import CostBundle
from app.domain.entities.recommendation import Recommendation
from app.domain.rules.matcher import conditions_match
from app.infrastructure.loaders.rule_loader import RuleLoader


class RecommendationEngine:
    def __init__(self, rule_loader: RuleLoader) -> None:
        self.rule_loader = rule_loader

    def recommend(self, intake: IntakeRequest) -> list[Recommendation]:
        rules = self.rule_loader.load_recommendation_rules()
        bundles_raw = self.rule_loader.load_bundles()

        bundle_map = {
            bundle.id: CostBundle.model_validate(bundle.model_dump())
            for bundle in bundles_raw
        }

        answer_payload = intake.answers.model_dump()
        recommendations: list[Recommendation] = []

        for rule in rules:
            if rule.category.value != intake.category.value:
                continue

            if not conditions_match(answer_payload, rule.conditions):
                continue

            for rec in rule.recommendations:
                recommendations.append(
                    Recommendation(
                        care_setting=rec.care_setting,
                        rank=rec.rank,
                        rationale=rec.rationale,
                        bundles=[bundle_map[bundle_id] for bundle_id in rec.bundle_ids],
                    )
                )

        deduped: dict[str, Recommendation] = {}
        for rec in sorted(recommendations, key=lambda r: r.rank):
            deduped.setdefault(rec.care_setting.value, rec)

        return list(deduped.values())[:3]
