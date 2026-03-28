from pydantic import BaseModel
from app.domain.enums.care_setting import CareSetting
from app.domain.entities.cost_bundle import CostBundle


class Recommendation(BaseModel):
    care_setting: CareSetting
    rank: int
    rationale: str
    bundles: list[CostBundle]
