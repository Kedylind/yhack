from pydantic import BaseModel
from app.domain.enums.care_setting import CareSetting


class ScenarioCosts(BaseModel):
    deductible_met: float
    deductible_partial: float
    deductible_not_met: float


class CostBundle(BaseModel):
    id: str
    name: str
    care_setting: CareSetting
    description: str
    scenario_costs: ScenarioCosts
    notes: list[str] = []
