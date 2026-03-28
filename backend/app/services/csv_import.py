"""CSV → MongoDB idempotent import for demo data."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from pymongo.database import Database

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
    db["prices"].create_index([("provider_id", 1), ("bundle_id", 1)])
    db["procedures"].create_index([("bundle_id", 1)])
