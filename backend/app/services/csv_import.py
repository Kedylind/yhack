"""CSV → MongoDB idempotent import for demo data."""

from __future__ import annotations

import csv
import hashlib
from pathlib import Path
from typing import Any

from pymongo.database import Database

# Scenario bundle → CPT used to pick a row in hospital_rates (MVP; aligns with az CPT list).
BUNDLE_CPT_AZ_MVP: dict[str, str] = {
    "colonoscopy_screening": "45378",
    "colonoscopy_diagnostic": "45378",
    "colonoscopy_with_biopsy": "45380",
    "colonoscopy_polyp": "45385",
    "egd_with_biopsy": "43235",
    "egd_bleeding": "43255",
    "egd_dilation": "43249",
    "egd_band_ligation": "43244",
    "gi_imaging_ct": "74176",
    "capsule_endoscopy": "91110",
    "gi_general": "45378",
}

AZ_PROVIDERS_COLUMNS = (
    "npi",
    "first_name",
    "last_name",
    "credential",
    "gender",
    "address",
    "city",
    "state",
    "zip",
    "phone",
)

# Center of Boston Medical Center area (South End) for map demo when lat/lng are not in CSV.
_AZ_MVP_REF_LAT = 42.3358
_AZ_MVP_REF_LNG = -71.0726

PROVIDERS_COLUMNS = (
    "npi",
    "name",
    "address",
    "city",
    "zip",
    "lat",
    "lng",
    "taxonomy",
    "phone",
    "specialties",
    "source",
    "hospital",
)
PROCEDURES_COLUMNS = ("bundle_id", "label", "cpt_codes", "tags", "source")
PRICES_COLUMNS = (
    "provider_id",
    "bundle_id",
    "min_rate_cents",
    "max_rate_cents",
    "payer",
    "source",
    "confidence",
    "effective_date",
)
INSURERS_COLUMNS = (
    "plan_id",
    "carrier",
    "deductible_cents",
    "oop_max_cents",
    "coinsurance_pct",
    "copay_cents",
    "source",
)


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _npi_jitter_lat_lng(npi: str) -> tuple[float, float]:
    """Stable small spread so bbox map queries work without real geocoding."""
    h = int(hashlib.sha256(npi.encode()).hexdigest()[:12], 16)
    lat_off = ((h % 2000) - 1000) / 80000.0
    lng_off = (((h // 2000) % 2000) - 1000) / 80000.0
    return _AZ_MVP_REF_LAT + lat_off, _AZ_MVP_REF_LNG + lng_off


def _parse_float_cell(raw: str) -> float | None:
    s = (raw or "").strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _dollars_to_cents(x: float | None) -> int | None:
    if x is None:
        return None
    return int(round(x * 100))


def _require_columns(row_keys: set[str], required: tuple[str, ...], file_label: str) -> None:
    missing = [c for c in required if c not in row_keys]
    if missing:
        raise ValueError(f"{file_label}: missing columns: {', '.join(missing)}")


def import_providers_csv(db: Database, path: Path) -> int:
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), PROVIDERS_COLUMNS, path.name)
    col = db["providers"]
    count = 0
    for row in rows:
        npi = row["npi"].strip()
        lat = float(row["lat"])
        lng = float(row["lng"])
        specialties = [s.strip() for s in row["specialties"].split(",") if s.strip()]
        doc: dict[str, Any] = {
            "_id": npi,
            "npi": npi,
            "name": row["name"].strip(),
            "address": row["address"].strip(),
            "city": row["city"].strip(),
            "zip": row["zip"].strip(),
            "location": {"type": "Point", "coordinates": [lng, lat]},
            "taxonomy": row["taxonomy"].strip(),
            "phone": row["phone"].strip(),
            "specialties": specialties,
            "source": row["source"].strip(),
            "hospital": row.get("hospital", "").strip(),
        }
        col.replace_one({"_id": npi}, doc, upsert=True)
        count += 1
    return count


def import_procedures_csv(db: Database, path: Path) -> int:
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), PROCEDURES_COLUMNS, path.name)
    col = db["procedures"]
    count = 0
    for row in rows:
        bid = row["bundle_id"].strip()
        cpt_codes = [c.strip() for c in row["cpt_codes"].split("|") if c.strip()]
        doc: dict[str, Any] = {
            "_id": bid,
            "bundle_id": bid,
            "label": row["label"].strip(),
            "cpt_codes": cpt_codes,
            "tags": row["tags"].strip(),
            "source": row["source"].strip(),
        }
        col.replace_one({"_id": bid}, doc, upsert=True)
        count += 1
    return count


def import_prices_csv(db: Database, path: Path) -> int:
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), PRICES_COLUMNS, path.name)
    col = db["prices"]
    count = 0
    for row in rows:
        provider_id = row["provider_id"].strip()
        bundle_id = row["bundle_id"].strip()
        source = row["source"].strip()
        effective = row["effective_date"].strip()
        filter_key = {
            "provider_id": provider_id,
            "bundle_id": bundle_id,
            "source": source,
            "effective_date": effective,
        }
        doc: dict[str, Any] = {
            **filter_key,
            "min_rate_cents": int(row["min_rate_cents"]),
            "max_rate_cents": int(row["max_rate_cents"]),
            "payer": row["payer"].strip(),
            "confidence": float(row["confidence"]),
        }
        col.replace_one(filter_key, doc, upsert=True)
        count += 1
    return count


def import_insurers_csv(db: Database, path: Path) -> int:
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), INSURERS_COLUMNS, path.name)
    col = db["insurers"]
    count = 0
    for row in rows:
        pid = row["plan_id"].strip()
        doc: dict[str, Any] = {
            "_id": pid,
            "plan_id": pid,
            "carrier": row["carrier"].strip(),
            "deductible_cents": int(row["deductible_cents"]),
            "oop_max_cents": int(row["oop_max_cents"]),
            "coinsurance_pct": int(row["coinsurance_pct"]),
            "copay_cents": int(row["copay_cents"]),
            "source": row["source"].strip(),
        }
        col.replace_one({"_id": pid}, doc, upsert=True)
        count += 1
    return count


def import_az_providers_csv(
    db: Database,
    path: Path,
    specialty: str = "Gastroenterology",
    taxonomy: str = "207RG0100X",
) -> int:
    """Load providers CSV into `providers` collection, tagged with specialty."""
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), AZ_PROVIDERS_COLUMNS, path.name)
    col = db["providers"]
    count = 0
    for row in rows:
        npi = row["npi"].strip()
        first = row["first_name"].strip()
        last = row["last_name"].strip()
        cred = row["credential"].strip()
        name_parts = [first, last]
        if cred:
            name_parts.append(cred)
        name = " ".join(name_parts)
        lat, lng = _npi_jitter_lat_lng(npi)
        doc: dict[str, Any] = {
            "_id": npi,
            "npi": npi,
            "name": name,
            "address": row["address"].strip(),
            "city": row["city"].strip(),
            "zip": row["zip"].strip(),
            "state": row.get("state", "").strip(),
            "location": {"type": "Point", "coordinates": [lng, lat]},
            "taxonomy": taxonomy,
            "phone": row["phone"].strip(),
            "specialties": [specialty],
            "source": "az_mvp",
            "hospital": row.get("hospital", "").strip(),
        }
        col.replace_one({"_id": npi}, doc, upsert=True)
        count += 1
    return count


def import_hospital_rates_csv(db: Database, path: Path) -> int:
    """Load hospital_rates_clean.csv into `hospital_rates` (one doc per hospital × CPT row)."""
    rows = _read_csv(path)
    if not rows:
        return 0
    col = db["hospital_rates"]
    count = 0
    for row in rows:
        hid = row["hospital_id"].strip()
        cpt = str(row["cpt"]).strip()
        doc_id = f"{hid}:{cpt}"
        doc: dict[str, Any] = {
            "_id": doc_id,
            "hospital_id": hid,
            "hospital_name": row.get("hospital_name", "").strip(),
            "neighborhood": row.get("neighborhood", "").strip(),
            "system": row.get("system", "").strip(),
            "data_completeness": row.get("data_completeness", "").strip(),
            "cpt": cpt,
            "cpt_desc": row.get("cpt_desc", "").strip(),
            "gross_charge": _parse_float_cell(row.get("gross_charge", "")),
            "discounted_cash": _parse_float_cell(row.get("discounted_cash", "")),
            "de_identified_min": _parse_float_cell(row.get("de_identified_min", "")),
            "de_identified_max": _parse_float_cell(row.get("de_identified_max", "")),
            "bcbs_price": _parse_float_cell(row.get("bcbs_price", "")),
            "bcbs_source": row.get("bcbs_source", "").strip(),
            "bcbs_plan": row.get("bcbs_plan", "").strip(),
            "aetna_price": _parse_float_cell(row.get("aetna_price", "")),
            "aetna_source": row.get("aetna_source", "").strip(),
            "harvard_pilgrim_price": _parse_float_cell(row.get("harvard_pilgrim_price", "")),
            "hp_plan_name": row.get("hp_plan_name", "").strip(),
            "hp_source": row.get("hp_source", "").strip(),
            "uhc_price": _parse_float_cell(row.get("uhc_price", "")),
            "uhc_source": row.get("uhc_source", "").strip(),
            "bcbs_tic_rate": _parse_float_cell(row.get("bcbs_tic_rate", "")),
            "bcbs_tic_billing_class": row.get("bcbs_tic_billing_class", "").strip(),
            "billing_class": row.get("billing_class", "unknown").strip(),
            "setting": row.get("setting", "").strip(),
            "rate_methodology": row.get("rate_methodology", "").strip(),
            "turquoise_bundled_price": _parse_float_cell(row.get("turquoise_bundled_price", "")),
            "turquoise_quality_rating": _parse_float_cell(row.get("turquoise_quality_rating", "")),
            "masscomparecare_total_paid": _parse_float_cell(
                row.get("masscomparecare_total_paid", "")
            ),
            "fh_physician_in_network": _parse_float_cell(row.get("fh_physician_in_network", "")),
            "fh_anesthesia_in_network": _parse_float_cell(row.get("fh_anesthesia_in_network", "")),
            "fh_facility_hosp_in_network": _parse_float_cell(
                row.get("fh_facility_hosp_in_network", "")
            ),
            "fh_pathology_in_network": _parse_float_cell(row.get("fh_pathology_in_network", "")),
            "source": "az_mvp",
        }
        col.replace_one({"_id": doc_id}, doc, upsert=True)
        count += 1
    return count


# Hospital rate CSV columns → `prices.payer` keys (see estimate_service / payer_mapping).
_AZ_PAYER_RATE_FIELDS: tuple[tuple[str, str], ...] = (
    ("bcbs_price", "BCBS_MA"),
    ("aetna_price", "AETNA"),
    ("harvard_pilgrim_price", "HARVARD_PILGRIM"),
    ("uhc_price", "UHC"),
)


def import_az_mvp_prices(
    db: Database,
    hospital_id: str = "bmc",
    effective_date: str = "2024-01-01",
) -> int:
    """
    For each NPI in `providers` with source az_mvp, upsert `prices` rows per payer
    using negotiated rates from hospital_rates (bcbs/aetna/HP/UHC columns) when present,
    else de-identified min/max for BCBS_MA only.
    """
    col = db["prices"]
    npis = [d["npi"] for d in db["providers"].find({"source": "az_mvp"}, {"npi": 1})]
    if not npis:
        return 0

    count = 0
    for bundle_id, cpt in BUNDLE_CPT_AZ_MVP.items():
        hr = db["hospital_rates"].find_one(
            {"hospital_id": hospital_id, "cpt": cpt},
        )
        if not hr:
            continue

        dmin = hr.get("de_identified_min")
        dmax = hr.get("de_identified_max")
        fallback_min_c = _dollars_to_cents(dmin) if dmin is not None else None
        fallback_max_c = _dollars_to_cents(dmax) if dmax is not None else None
        if fallback_min_c is None and fallback_max_c is None:
            g = hr.get("gross_charge")
            gc = _dollars_to_cents(g) if g is not None else None
            fallback_min_c = fallback_max_c = gc or 0
        elif fallback_min_c is None:
            fallback_min_c = fallback_max_c or 0
        elif fallback_max_c is None:
            fallback_max_c = fallback_min_c

        payer_bands: list[tuple[str, int, int]] = []
        for field_name, payer_key in _AZ_PAYER_RATE_FIELDS:
            raw = hr.get(field_name)
            c = _dollars_to_cents(raw) if raw is not None else None
            if c is None or c <= 0:
                continue
            payer_bands.append((payer_key, c, c))

        if not payer_bands:
            payer_bands.append(
                ("BCBS_MA", int(fallback_min_c), int(fallback_max_c or fallback_min_c)),
            )

        for npi in npis:
            for payer_key, min_c, max_c in payer_bands:
                filter_key = {
                    "provider_id": npi,
                    "bundle_id": bundle_id,
                    "payer": payer_key,
                    "source": "az_mvp",
                    "effective_date": effective_date,
                }
                doc: dict[str, Any] = {
                    **filter_key,
                    "min_rate_cents": min_c,
                    "max_rate_cents": max_c,
                    "confidence": 0.88,
                    "mvp_hospital_id": hospital_id,
                }
                col.replace_one(filter_key, doc, upsert=True)
                count += 1

    return count


def import_az_directory(
    db: Database,
    directory: Path,
    *,
    price_hospital_id: str = "bmc",
) -> dict[str, int]:
    """Import data/az-data: providers, hospital_rates, and synthetic per-NPI prices.
    Also imports derm data if providers_derm.csv and hospital_rates_derm.csv exist."""
    counts: dict[str, int] = {}
    # GI providers
    p = directory / "providers.csv"
    if p.exists():
        counts["providers_gi"] = import_az_providers_csv(db, p)
    # GI hospital rates
    p = directory / "hospital_rates_clean.csv"
    if p.exists():
        counts["hospital_rates_gi"] = import_hospital_rates_csv(db, p)
    if counts.get("providers_gi") and counts.get("hospital_rates_gi"):
        counts["prices_gi"] = import_az_mvp_prices(db, hospital_id=price_hospital_id)
    # Derm providers
    p = directory / "providers_derm.csv"
    if p.exists():
        counts["providers_derm"] = import_az_providers_csv(
            db,
            p,
            specialty="Dermatology",
            taxonomy="207N00000X",
        )
    # Derm hospital rates
    p = directory / "hospital_rates_derm.csv"
    if p.exists():
        counts["hospital_rates_derm"] = import_hospital_rates_csv(db, p)
    return counts


def import_sample_directory(db: Database, directory: Path) -> dict[str, int]:
    """Import all sample CSVs from a directory; return counts per collection."""
    counts: dict[str, int] = {}
    p = directory / "providers.csv"
    if p.exists():
        counts["providers"] = import_providers_csv(db, p)
    p = directory / "procedures.csv"
    if p.exists():
        counts["procedures"] = import_procedures_csv(db, p)
    p = directory / "prices.csv"
    if p.exists():
        counts["prices"] = import_prices_csv(db, p)
    p = directory / "insurers.csv"
    if p.exists():
        counts["insurers"] = import_insurers_csv(db, p)
    return counts


def ensure_indexes(db: Database) -> None:
    db["providers"].create_index([("location", "2dsphere")])
    db["providers"].create_index([("zip", 1), ("specialties", 1)])
    db["prices"].create_index([("provider_id", 1), ("bundle_id", 1), ("payer", 1)])
    db["procedures"].create_index([("bundle_id", 1)])
    db["hospital_rates"].create_index([("hospital_id", 1), ("cpt", 1)])
