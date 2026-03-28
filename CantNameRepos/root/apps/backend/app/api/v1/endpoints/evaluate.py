from fastapi import APIRouter, Depends

from app.api.deps import get_evaluate_acne_case_use_case
from app.application.dto.result_dto import EvaluationResultDTO
from app.application.use_cases.evaluate_acne_case import EvaluateAcneCaseUseCase
from app.domain.entities.intake import IntakeRequest

router = APIRouter()


@router.post("", response_model=EvaluationResultDTO)
def evaluate_acne_case(
    payload: IntakeRequest,
    use_case: EvaluateAcneCaseUseCase = Depends(get_evaluate_acne_case_use_case),
) -> EvaluationResultDTO:
    return use_case.execute(payload)
