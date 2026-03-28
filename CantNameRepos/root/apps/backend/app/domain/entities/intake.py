from pydantic import BaseModel, Field
from app.domain.enums.complaint_category import ComplaintCategory


class IntakeAnswers(BaseModel):
    severity: str = Field(..., description="mild, moderate, severe")
    duration_weeks: int = Field(..., ge=0)
    first_time_visit: bool
    wants_cosmetic_treatment: bool
    facial_swelling: bool
    fever: bool
    rapidly_worsening: bool
    pregnant: bool = False


class IntakeRequest(BaseModel):
    zip_code: str = Field(..., min_length=5, max_length=10)
    age: int = Field(..., ge=0, le=120)
    plan_id: str
    category: ComplaintCategory
    answers: IntakeAnswers
