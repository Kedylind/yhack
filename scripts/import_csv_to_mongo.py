#!/usr/bin/env python3
"""CLI: import data/samples (or DATA_DIR) CSVs into MongoDB."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Repo root = parent of scripts/
ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from pymongo import MongoClient  # noqa: E402

from app.services.csv_import import (  # noqa: E402
    ensure_indexes,
    import_az_directory,
    import_insurers_csv,
    import_procedures_csv,
    import_sample_directory,
)


def main() -> int:
    # Load backend/.env so MONGODB_URI matches uvicorn without manual export
    env_path = BACKEND / ".env"
    if env_path.is_file():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path)
        except ImportError:
            pass

    parser = argparse.ArgumentParser(description="Import CSV fixtures into MongoDB")
    parser.add_argument(
        "--data-dir",
        default=os.environ.get("DATA_DIR", str(ROOT / "data" / "samples")),
        help="Directory containing providers.csv, procedures.csv, etc.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate CSVs against an in-memory DB (no real Mongo writes)",
    )
    parser.add_argument(
        "--mongodb-uri",
        default=os.environ.get("MONGODB_URI", "mongodb://localhost:27017"),
    )
    parser.add_argument(
        "--db-name",
        default=os.environ.get("MONGODB_DB_NAME", "boston_gi_demo"),
    )
    parser.add_argument(
        "--az-mvp",
        action="store_true",
        help="Load data/az-data (NPI providers + hospital_rates + per-NPI prices from BMC CPT rows). "
        "Also imports procedures.csv and insurers.csv from --seed-dir (default: data/samples).",
    )
    parser.add_argument(
        "--seed-dir",
        default=str(ROOT / "data" / "samples"),
        help="With --az-mvp: directory for procedures.csv and insurers.csv",
    )
    parser.add_argument(
        "--price-hospital-id",
        default="bmc",
        help="With --az-mvp: hospital_id in hospital_rates to derive allowed amounts (default: bmc)",
    )
    args = parser.parse_args()
    data_dir = Path(args.data_dir)
    if not data_dir.is_dir():
        print(f"Error: data directory not found: {data_dir}", file=sys.stderr)
        return 1

    if args.dry_run:
        import mongomock  # noqa: PLC0415

        db = mongomock.MongoClient()["dry_import"]
        if args.az_mvp:
            seed = Path(args.seed_dir)
            for name, fn in (
                ("procedures", import_procedures_csv),
                ("insurers", import_insurers_csv),
            ):
                p = seed / f"{name}.csv"
                if p.exists():
                    fn(db, p)
            az_dir = Path(os.environ.get("AZ_DATA_DIR", str(ROOT / "data" / "az-data")))
            counts = import_az_directory(db, az_dir, price_hospital_id=args.price_hospital_id)
        else:
            counts = import_sample_directory(db, data_dir)
        ensure_indexes(db)
        print("dry-run counts:", counts)
        return 0

    client = MongoClient(args.mongodb_uri)
    db = client[args.db_name]
    if args.az_mvp:
        seed = Path(args.seed_dir)
        for name, fn in (
            ("procedures", import_procedures_csv),
            ("insurers", import_insurers_csv),
        ):
            p = seed / f"{name}.csv"
            if p.exists():
                fn(db, p)
        az_dir = Path(os.environ.get("AZ_DATA_DIR", str(ROOT / "data" / "az-data")))
        if not az_dir.is_dir():
            print(f"Error: AZ data directory not found: {az_dir}", file=sys.stderr)
            return 1
        counts = import_az_directory(db, az_dir, price_hospital_id=args.price_hospital_id)
    else:
        counts = import_sample_directory(db, data_dir)
    ensure_indexes(db)
    for k, v in counts.items():
        print(f"{k}: {v} documents upserted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
