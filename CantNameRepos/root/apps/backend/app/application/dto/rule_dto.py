from pydantic import BaseModel, Field
from app.domain.enums.care_setting import CareSetting
from app.domain.enums.complaint_category import ComplaintCategory


class ScenarioCostsDTO(BaseModel):
    deductible_met: float = Field(..., ge=0)
    deductible_partial: float = Field(..., ge=0)
    deductible_not_met: float = Field(..., ge=0)


class BundleDTO(BaseModel):
    id: str
    name: str
    care_setting: CareSetting
    description: str
    scenario_costs: ScenarioCostsDTO
    notes: list[str] = []


class RecommendationOptionDTO(BaseModel):
    care_setting: CareSetting
    rank: int
    rationale: str
    bundle_ids: list[str]


class RecommendationRuleDTO(BaseModel):
    id: str
    category: ComplaintCategory
    conditions: dict
    recommendations: list[RecommendationOptionDTO]


class RedFlagRuleDTO(BaseModel):
    id: str
    category: ComplaintCategory
    conditions: dict
    message: str
