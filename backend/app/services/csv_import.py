"""CSV → PostgreSQL idempotent import for demo data."""

from __future__ import annotations

import csv
import hashlib
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.db.tables import HospitalRate, Insurer, Price, Procedure, Provider

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


def _upsert_provider(session: Session, doc: dict[str, Any]) -> None:
    stmt = (
        pg_insert(Provider)
        .values(**doc)
        .on_conflict_do_update(
            index_elements=[Provider.npi.key],
            set_={
                "name": doc["name"],
                "address": doc["address"],
                "city": doc["city"],
                "zip": doc["zip"],
                "state": doc.get("state"),
                "lat": doc["lat"],
                "lng": doc["lng"],
                "taxonomy": doc["taxonomy"],
                "phone": doc["phone"],
                "specialties": doc["specialties"],
                "source": doc["source"],
                "hospital": doc["hospital"],
            },
        )
    )
    session.execute(stmt)


def import_providers_csv(session: Session, path: Path) -> int:
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), PROVIDERS_COLUMNS, path.name)
    count = 0
    for row in rows:
        npi = row["npi"].strip()
        lat = float(row["lat"])
        lng = float(row["lng"])
        specialties = [s.strip() for s in row["specialties"].split(",") if s.strip()]
        doc: dict[str, Any] = {
            "npi": npi,
            "name": row["name"].strip(),
            "address": row["address"].strip(),
            "city": row["city"].strip(),
            "zip": row["zip"].strip(),
            "state": None,
            "lat": lat,
            "lng": lng,
            "taxonomy": row["taxonomy"].strip(),
            "phone": row["phone"].strip(),
            "specialties": specialties,
            "source": row["source"].strip(),
            "hospital": row.get("hospital", "").strip(),
        }
        _upsert_provider(session, doc)
        count += 1
    return count


def import_procedures_csv(session: Session, path: Path) -> int:
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), PROCEDURES_COLUMNS, path.name)
    count = 0
    for row in rows:
        bid = row["bundle_id"].strip()
        cpt_codes = [c.strip() for c in row["cpt_codes"].split("|") if c.strip()]
        doc: dict[str, Any] = {
            "bundle_id": bid,
            "label": row["label"].strip(),
            "cpt_codes": cpt_codes,
            "tags": row["tags"].strip(),
            "source": row["source"].strip(),
        }
        stmt = (
            pg_insert(Procedure)
            .values(**doc)
            .on_conflict_do_update(
                index_elements=[Procedure.bundle_id.key],
                set_={
                    "label": doc["label"],
                    "cpt_codes": doc["cpt_codes"],
                    "tags": doc["tags"],
                    "source": doc["source"],
                },
            )
        )
        session.execute(stmt)
        count += 1
    return count


def import_prices_csv(session: Session, path: Path) -> int:
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), PRICES_COLUMNS, path.name)
    count = 0
    for row in rows:
        provider_id = row["provider_id"].strip()
        bundle_id = row["bundle_id"].strip()
        source = row["source"].strip()
        effective = row["effective_date"].strip()
        doc: dict[str, Any] = {
            "provider_id": provider_id,
            "bundle_id": bundle_id,
            "source": source,
            "effective_date": effective,
            "min_rate_cents": int(row["min_rate_cents"]),
            "max_rate_cents": int(row["max_rate_cents"]),
            "payer": row["payer"].strip(),
            "confidence": float(row["confidence"]),
            "mvp_hospital_id": None,
        }
        stmt = (
            pg_insert(Price)
            .values(**doc)
            .on_conflict_do_update(
                constraint="uq_prices_natural_key",
                set_={
                    "min_rate_cents": doc["min_rate_cents"],
                    "max_rate_cents": doc["max_rate_cents"],
                    "payer": doc["payer"],
                    "confidence": doc["confidence"],
                    "mvp_hospital_id": doc["mvp_hospital_id"],
                },
            )
        )
        session.execute(stmt)
        count += 1
    return count


def import_insurers_csv(session: Session, path: Path) -> int:
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), INSURERS_COLUMNS, path.name)
    count = 0
    for row in rows:
        pid = row["plan_id"].strip()
        doc: dict[str, Any] = {
            "plan_id": pid,
            "carrier": row["carrier"].strip(),
            "deductible_cents": int(row["deductible_cents"]),
            "oop_max_cents": int(row["oop_max_cents"]),
            "coinsurance_pct": int(row["coinsurance_pct"]),
            "copay_cents": int(row["copay_cents"]),
            "source": row["source"].strip(),
        }
        stmt = (
            pg_insert(Insurer)
            .values(**doc)
            .on_conflict_do_update(
                index_elements=[Insurer.plan_id.key],
                set_={
                    "carrier": doc["carrier"],
                    "deductible_cents": doc["deductible_cents"],
                    "oop_max_cents": doc["oop_max_cents"],
                    "coinsurance_pct": doc["coinsurance_pct"],
                    "copay_cents": doc["copay_cents"],
                    "source": doc["source"],
                },
            )
        )
        session.execute(stmt)
        count += 1
    return count


def import_az_providers_csv(session: Session, path: Path) -> int:
    """Load data/az-data/providers.csv into `providers` (NPI physicians, GI demo)."""
    rows = _read_csv(path)
    if not rows:
        return 0
    _require_columns(set(rows[0].keys()), AZ_PROVIDERS_COLUMNS, path.name)
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
            "npi": npi,
            "name": name,
            "address": row["address"].strip(),
            "city": row["city"].strip(),
            "zip": row["zip"].strip(),
            "state": row.get("state", "").strip() or None,
            "lat": lat,
            "lng": lng,
            "taxonomy": "207RG0100X",
            "phone": row["phone"].strip(),
            "specialties": ["Gastroenterology"],
            "source": "az_mvp",
            "hospital": row.get("hospital", "").strip(),
        }
        _upsert_provider(session, doc)
        count += 1
    return count


def import_hospital_rates_csv(session: Session, path: Path) -> int:
    """Load hospital_rates_clean.csv into `hospital_rates` (one row per hospital × CPT)."""
    rows = _read_csv(path)
    if not rows:
        return 0
    count = 0
    for row in rows:
        hid = row["hospital_id"].strip()
        cpt = str(row["cpt"]).strip()
        doc_id = f"{hid}:{cpt}"
        doc: dict[str, Any] = {
            "id": doc_id,
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
            "uhc_price": _parse_float_cell(row.get("uhc_price", "")),
            "bcbs_tic_rate": _parse_float_cell(row.get("bcbs_tic_rate", "")),
            "source": "az_mvp",
        }
        stmt = (
            pg_insert(HospitalRate)
            .values(**doc)
            .on_conflict_do_update(
                index_elements=[HospitalRate.id.key],
                set_={k: v for k, v in doc.items() if k != "id"},
            )
        )
        session.execute(stmt)
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
    session: Session,
    hospital_id: str = "bmc",
    effective_date: str = "2024-01-01",
) -> int:
    """
    For each NPI in `providers` with source az_mvp, upsert `prices` rows per payer
    using negotiated rates from hospital_rates (bcbs/aetna/HP/UHC columns) when present,
    else de-identified min/max for BCBS_MA only.
    """
    npis = list(
        session.scalars(select(Provider.npi).where(Provider.source == "az_mvp")).all()
    )
    if not npis:
        return 0

    count = 0
    for bundle_id, cpt in BUNDLE_CPT_AZ_MVP.items():
        hr = session.scalar(
            select(HospitalRate).where(
                HospitalRate.hospital_id == hospital_id,
                HospitalRate.cpt == cpt,
            )
        )
        if not hr:
            continue

        dmin = hr.de_identified_min
        dmax = hr.de_identified_max
        fallback_min_c = _dollars_to_cents(dmin) if dmin is not None else None
        fallback_max_c = _dollars_to_cents(dmax) if dmax is not None else None
        if fallback_min_c is None and fallback_max_c is None:
            g = hr.gross_charge
            gc = _dollars_to_cents(g) if g is not None else None
            fallback_min_c = fallback_max_c = gc or 0
        elif fallback_min_c is None:
            fallback_min_c = fallback_max_c or 0
        elif fallback_max_c is None:
            fallback_max_c = fallback_min_c

        payer_bands: list[tuple[str, int, int]] = []
        for field_name, payer_key in _AZ_PAYER_RATE_FIELDS:
            raw = getattr(hr, field_name, None)
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
                doc: dict[str, Any] = {
                    "provider_id": npi,
                    "bundle_id": bundle_id,
                    "payer": payer_key,
                    "source": "az_mvp",
                    "effective_date": effective_date,
                    "min_rate_cents": min_c,
                    "max_rate_cents": max_c,
                    "confidence": 0.88,
                    "mvp_hospital_id": hospital_id,
                }
                stmt = (
                    pg_insert(Price)
                    .values(**doc)
                    .on_conflict_do_update(
                        constraint="uq_prices_natural_key",
                        set_={
                            "min_rate_cents": doc["min_rate_cents"],
                            "max_rate_cents": doc["max_rate_cents"],
                            "confidence": doc["confidence"],
                            "mvp_hospital_id": doc["mvp_hospital_id"],
                        },
                    )
                )
                session.execute(stmt)
                count += 1

    return count


def import_az_directory(
    session: Session,
    directory: Path,
    *,
    price_hospital_id: str = "bmc",
) -> dict[str, int]:
    """Import data/az-data: providers, hospital_rates, and synthetic per-NPI prices."""
    counts: dict[str, int] = {}
    p = directory / "providers.csv"
    if p.exists():
        counts["providers"] = import_az_providers_csv(session, p)
    p = directory / "hospital_rates_clean.csv"
    if p.exists():
        counts["hospital_rates"] = import_hospital_rates_csv(session, p)
    if counts.get("providers") and counts.get("hospital_rates"):
        counts["prices"] = import_az_mvp_prices(session, hospital_id=price_hospital_id)
    return counts


def import_sample_directory(session: Session, directory: Path) -> dict[str, int]:
    """Import all sample CSVs from a directory; return counts per collection."""
    counts: dict[str, int] = {}
    p = directory / "providers.csv"
    if p.exists():
        counts["providers"] = import_providers_csv(session, p)
    p = directory / "procedures.csv"
    if p.exists():
        counts["procedures"] = import_procedures_csv(session, p)
    p = directory / "prices.csv"
    if p.exists():
        counts["prices"] = import_prices_csv(session, p)
    p = directory / "insurers.csv"
    if p.exists():
        counts["insurers"] = import_insurers_csv(session, p)
    return counts


def ensure_indexes(_session: Session) -> None:
    """Indexes are created by Alembic migrations; kept for API compatibility."""
    return None
