from pydantic import BaseModel
from app.domain.entities.recommendation import Recommendation


class RedFlagResult(BaseModel):
    triggered: bool
    message: str | None = None


class EvaluationResultDTO(BaseModel):
    supported: bool
    red_flag: RedFlagResult
    recommendations: list[Recommendation]
    assumptions: list[str]
