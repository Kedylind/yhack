"""Hospital-level summary: exact coordinates, BCBS price, de-identified min/max."""

from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import DbDep
from app.db.tables import HospitalRate, Provider

router = APIRouter()

# Verified hospital coordinates (real addresses, not averaged from providers)
_HOSPITAL_INFO: dict[str, dict[str, Any]] = {
    "Massachusetts General Hospital": {"id": "mgh", "lat": 42.3632, "lng": -71.0686},
    "Brigham and Women's Hospital": {"id": "brigham", "lat": 42.3358, "lng": -71.1065},
    "Beth Israel Deaconess Medical Center": {"id": "bidmc", "lat": 42.3389, "lng": -71.1063},
    "Boston Medical Center": {"id": "bmc", "lat": 42.3346, "lng": -71.0721},
    "Tufts Medical Center": {"id": "tufts", "lat": 42.3495, "lng": -71.0636},
    "Brigham and Women's Faulkner": {"id": "faulkner", "lat": 42.3082, "lng": -71.1271},
    "Boston Children's Hospital": {"id": "childrens", "lat": 42.3375, "lng": -71.1064},
    "Dana-Farber Cancer Institute": {"id": "dana_farber", "lat": 42.3382, "lng": -71.1068},
    "BMC Brighton (Formerly St. Elizabeth's)": {
        "id": "bmc_brighton",
        "lat": 42.3545,
        "lng": -71.1525,
    },
    "Atrius Health / Harvard Vanguard": {"id": None, "lat": 42.3415, "lng": -71.1006},
    "VA Boston Healthcare System": {"id": None, "lat": 42.3340, "lng": -71.1100},
    "Faulkner Hospital": {"id": None, "lat": 42.3082, "lng": -71.1271},
}


@router.get("/insurance-options")
def get_insurance_options(db: DbDep) -> dict[str, Any]:
    """Insurer keys/labels and BCBS plan names derived from `hospital_rates`."""
    from app.services.insurance_options import build_insurance_options

    return build_insurance_options(db)


@router.get("")
def list_hospitals(
    db: DbDep,
    cpt: str = Query("45378", description="CPT code for pricing (default: screening colonoscopy)"),
) -> list[dict[str, Any]]:
    """Return one entry per hospital with exact coordinates and pricing."""
    rows = db.execute(
        select(Provider.hospital, func.count())
        .where(Provider.hospital != "")
        .where(Provider.hospital.isnot(None))
        .group_by(Provider.hospital)
    ).all()
    counts = {h: int(cnt) for h, cnt in rows if h}

    rates_list = db.scalars(select(HospitalRate).where(HospitalRate.cpt == cpt)).all()
    rates_by_id = {r.hospital_id: r for r in rates_list}

    results = []
    for name, count in counts.items():
        info = _HOSPITAL_INFO.get(name, {})
        lat = info.get("lat")
        lng = info.get("lng")
        if lat is None or lng is None:
            continue
        hid = info.get("id")
        rate = rates_by_id.get(hid, None) if hid else None
        rate_d: dict[str, Any] = {}
        if rate is not None:
            rate_d = {
                "bcbs_price": rate.bcbs_price,
                "aetna_price": rate.aetna_price,
                "harvard_pilgrim_price": rate.harvard_pilgrim_price,
                "uhc_price": rate.uhc_price,
                "de_identified_min": rate.de_identified_min,
                "de_identified_max": rate.de_identified_max,
                "gross_charge": rate.gross_charge,
                "discounted_cash": rate.discounted_cash,
                "cpt_desc": rate.cpt_desc or "",
            }
        results.append(
            {
                "name": name,
                "hospital_id": hid,
                "lat": lat,
                "lng": lng,
                "doctor_count": count,
                "bcbs_price": rate_d.get("bcbs_price"),
                "aetna_price": rate_d.get("aetna_price"),
                "harvard_pilgrim_price": rate_d.get("harvard_pilgrim_price"),
                "uhc_price": rate_d.get("uhc_price"),
                "de_identified_min": rate_d.get("de_identified_min"),
                "de_identified_max": rate_d.get("de_identified_max"),
                "gross_charge": rate_d.get("gross_charge"),
                "discounted_cash": rate_d.get("discounted_cash"),
                "cpt": cpt,
                "cpt_desc": rate_d.get("cpt_desc", ""),
            }
        )

    results.sort(key=lambda x: x["doctor_count"], reverse=True)
    return results
