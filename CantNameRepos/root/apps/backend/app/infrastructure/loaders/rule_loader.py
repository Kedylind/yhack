import json
from pathlib import Path
from typing import Any

from app.application.dto.rule_dto import (
    BundleDTO,
    RecommendationRuleDTO,
    RedFlagRuleDTO,
)
from app.infrastructure.config.settings import get_settings


class RuleLoader:
    def __init__(self) -> None:
        settings = get_settings()
        backend_root = Path(__file__).resolve().parents[3]
        self.base_path = backend_root / settings.rules_path

    def _load_json(self, filename: str) -> list[dict[str, Any]]:
        path = self.base_path / filename
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def load_recommendation_rules(self) -> list[RecommendationRuleDTO]:
        raw = self._load_json("recommendation_rules.json")
        return [RecommendationRuleDTO.model_validate(item) for item in raw]

    def load_bundles(self) -> list[BundleDTO]:
        raw = self._load_json("bundles.json")
        return [BundleDTO.model_validate(item) for item in raw]

    def load_red_flags(self) -> list[RedFlagRuleDTO]:
        raw = self._load_json("red_flags.json")
        return [RedFlagRuleDTO.model_validate(item) for item in raw]
