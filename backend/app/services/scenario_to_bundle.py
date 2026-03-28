"""Deterministic scenario → CPT bundle mapping."""

from __future__ import annotations

from typing import Any

# Closed set for LLM / intake
SCENARIO_IDS = (
    "colonoscopy_screening",
    "colonoscopy_diagnostic",
    "egd_with_biopsy",
    "gi_general",
)


def infer_scenario_id(intake: dict[str, Any], confirmed: dict[str, Any] | None) -> str:
    merged = {**(confirmed or {}), **intake}
    explicit = merged.get("scenario_id")
    if isinstance(explicit, str) and explicit in SCENARIO_IDS:
        return explicit

    text = " ".join(
        [
            str(merged.get("free_text") or ""),
            " ".join(merged.get("symptoms") or []) if isinstance(merged.get("symptoms"), list) else "",
        ]
    ).lower()

    if any(x in text for x in ("screening", "preventive", "routine colon")):
        return "colonoscopy_screening"
    if any(x in text for x in ("bleeding", "pain", "diagnostic", "symptom")):
        return "colonoscopy_diagnostic"
    if "egd" in text or "endoscopy" in text or "biopsy" in text:
        return "egd_with_biopsy"
    if merged.get("care_focus") and "gastro" in str(merged.get("care_focus")).lower():
        return "colonoscopy_screening"
    return "gi_general"


def scenario_to_bundle_id(scenario_id: str) -> str:
    mapping = {
        "colonoscopy_screening": "colonoscopy_screening",
        "colonoscopy_diagnostic": "colonoscopy_diagnostic",
        "egd_with_biopsy": "egd_with_biopsy",
        "gi_general": "colonoscopy_screening",
    }
    return mapping.get(scenario_id, "colonoscopy_screening")
