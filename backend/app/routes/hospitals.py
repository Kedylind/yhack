"""Hospital-level summary: exact coordinates, BCBS price, de-identified min/max."""

from typing import Any

from fastapi import APIRouter, Query

from app.api.deps import DbDep

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


@router.get("")
def list_hospitals(
    db: DbDep,
    cpt: str = Query("45378", description="CPT code for pricing (default: screening colonoscopy)"),
) -> list[dict[str, Any]]:
    """Return one entry per hospital with exact coordinates and pricing."""
    # Count doctors per hospital (no coordinate math needed)
    pipeline = [
        {"$match": {"hospital": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$hospital", "doctor_count": {"$sum": 1}}},
    ]
    counts = {h["_id"]: h["doctor_count"] for h in db["providers"].aggregate(pipeline)}

    # Get pricing for requested CPT
    rates_by_id = {}
    for rate in db["hospital_rates"].find({"cpt": cpt}):
        rates_by_id[rate["hospital_id"]] = rate

    results = []
    for name, count in counts.items():
        info = _HOSPITAL_INFO.get(name, {})
        lat = info.get("lat")
        lng = info.get("lng")
        if lat is None or lng is None:
            continue
        hid = info.get("id")
        rate = rates_by_id.get(hid, {}) if hid else {}
        results.append(
            {
                "name": name,
                "hospital_id": hid,
                "lat": lat,
                "lng": lng,
                "doctor_count": count,
                "bcbs_price": rate.get("bcbs_price"),
                "aetna_price": rate.get("aetna_price"),
                "harvard_pilgrim_price": rate.get("harvard_pilgrim_price"),
                "uhc_price": rate.get("uhc_price"),
                "de_identified_min": rate.get("de_identified_min"),
                "de_identified_max": rate.get("de_identified_max"),
                "gross_charge": rate.get("gross_charge"),
                "discounted_cash": rate.get("discounted_cash"),
                "cpt": cpt,
                "cpt_desc": rate.get("cpt_desc", ""),
            }
        )

    results.sort(key=lambda x: x["doctor_count"], reverse=True)
    return results
