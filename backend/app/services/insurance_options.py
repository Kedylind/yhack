"""Derive onboarding insurance dropdowns from `hospital_rates` (MongoDB)."""

from __future__ import annotations

from typing import Any

from pymongo.database import Database

# Keys must match estimate / payer mapping (slug from `*_price` column prefix).
INSURER_LABELS: dict[str, str] = {
    "bcbs": "Blue Cross Blue Shield (BCBS)",
    "aetna": "Aetna",
    "harvard_pilgrim": "Harvard Pilgrim",
    "uhc": "UnitedHealthcare (UHC)",
}

# Mongo field → slug (same convention as legacy CSV header parsing).
PRICE_FIELD_KEYS: tuple[tuple[str, str], ...] = (
    ("bcbs_price", "bcbs"),
    ("aetna_price", "aetna"),
    ("harvard_pilgrim_price", "harvard_pilgrim"),
    ("uhc_price", "uhc"),
)


def _field_has_positive_rate(col: Any, field: str) -> bool:
    doc = col.find_one({field: {"$gt": 0}})
    return doc is not None


def build_insurance_options(db: Database) -> dict[str, Any]:
    """
    Return insurer rows (from negotiated-rate columns) and distinct BCBS plan names.

    Empty `hospital_rates` yields empty lists — callers may substitute UI fallbacks.
    """
    col = db["hospital_rates"]
    insurers: list[dict[str, str]] = []
    for field, key in PRICE_FIELD_KEYS:
        if not _field_has_positive_rate(col, field):
            continue
        label = INSURER_LABELS.get(key, key.replace("_", " ").title())
        insurers.append(
            {
                "key": key,
                "label": label,
                "price_column": field,
            }
        )

    raw_plans = col.distinct("bcbs_plan")
    bcbs_plans = sorted(
        {str(p).strip() for p in raw_plans if p is not None and str(p).strip()}
    )

    return {"insurers": insurers, "bcbs_plan_options": bcbs_plans}
