from typing import Optional

from app.application.use_cases.evaluate_acne_case import EvaluateAcneCaseUseCase
from app.domain.services.scope_gate import ScopeGateService
from app.domain.services.red_flag_evaluator import RedFlagEvaluator
from app.domain.services.recommendation_engine import RecommendationEngine
from app.infrastructure.loaders.rule_loader import RuleLoader


def get_rule_loader() -> RuleLoader:
    return RuleLoader()


def get_scope_gate_service() -> ScopeGateService:
    return ScopeGateService()


def get_red_flag_evaluator(
    rule_loader: Optional[RuleLoader] = None,
) -> RedFlagEvaluator:
    loader = rule_loader or get_rule_loader()
    return RedFlagEvaluator(rule_loader=loader)


def get_recommendation_engine(
    rule_loader: Optional[RuleLoader] = None,
) -> RecommendationEngine:
    loader = rule_loader or get_rule_loader()
    return RecommendationEngine(rule_loader=loader)


def get_evaluate_acne_case_use_case() -> EvaluateAcneCaseUseCase:
    loader = get_rule_loader()
    return EvaluateAcneCaseUseCase(
        scope_gate=get_scope_gate_service(),
        red_flag_evaluator=get_red_flag_evaluator(loader),
        recommendation_engine=get_recommendation_engine(loader),
    )
