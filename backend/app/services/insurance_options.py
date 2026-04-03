"""Derive onboarding insurance dropdowns from `hospital_rates` (PostgreSQL)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.tables import HospitalRate

# Keys must match estimate / payer mapping (slug from `*_price` column prefix).
INSURER_LABELS: dict[str, str] = {
    "bcbs": "Blue Cross Blue Shield (BCBS)",
    "aetna": "Aetna",
    "harvard_pilgrim": "Harvard Pilgrim",
    "uhc": "UnitedHealthcare (UHC)",
}

# Column name → slug (same convention as legacy CSV header parsing).
PRICE_FIELD_KEYS: tuple[tuple[str, str], ...] = (
    ("bcbs_price", "bcbs"),
    ("aetna_price", "aetna"),
    ("harvard_pilgrim_price", "harvard_pilgrim"),
    ("uhc_price", "uhc"),
)


def _field_has_positive_rate(session: Session, field: str) -> bool:
    col = getattr(HospitalRate, field)
    row = session.scalar(select(HospitalRate).where(col > 0).limit(1))
    return row is not None


def build_insurance_options(session: Session) -> dict[str, Any]:
    """
    Return insurer rows (from negotiated-rate columns) and distinct BCBS plan names.

    Empty `hospital_rates` yields empty lists — callers may substitute UI fallbacks.
    """
    insurers: list[dict[str, str]] = []
    for field, key in PRICE_FIELD_KEYS:
        if not _field_has_positive_rate(session, field):
            continue
        label = INSURER_LABELS.get(key, key.replace("_", " ").title())
        insurers.append(
            {
                "key": key,
                "label": label,
                "price_column": field,
            }
        )

    plans = session.scalars(select(HospitalRate.bcbs_plan).distinct()).all()
    bcbs_plans = sorted({str(p).strip() for p in plans if p is not None and str(p).strip()})

    return {"insurers": insurers, "bcbs_plan_options": bcbs_plans}
