import { apiFetch } from "./client";
import type { EvaluationResponse, IntakeRequest } from "../types/api";

export async function evaluateAcneCase(
  payload: IntakeRequest
): Promise<EvaluationResponse> {
  return apiFetch<EvaluationResponse>("/api/v1/evaluate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
