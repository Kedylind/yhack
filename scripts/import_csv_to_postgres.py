#!/usr/bin/env python3
"""CLI: import data/samples (or DATA_DIR) CSVs into PostgreSQL."""

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

from sqlalchemy.orm import Session  # noqa: E402

from app.db.postgres import get_session_factory  # noqa: E402
from app.services.csv_import import (  # noqa: E402
    ensure_indexes,
    import_az_directory,
    import_insurers_csv,
    import_procedures_csv,
    import_sample_directory,
)


def main() -> int:
    env_path = BACKEND / ".env"
    if env_path.is_file():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path)
        except ImportError:
            pass

    parser = argparse.ArgumentParser(description="Import CSV fixtures into PostgreSQL")
    parser.add_argument(
        "--data-dir",
        default=os.environ.get("DATA_DIR", str(ROOT / "data" / "samples")),
        help="Directory containing providers.csv, procedures.csv, etc.",
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

    factory = get_session_factory()
    session: Session = factory()
    try:
        if args.az_mvp:
            seed = Path(args.seed_dir)
            if (seed / "procedures.csv").exists():
                import_procedures_csv(session, seed / "procedures.csv")
            if (seed / "insurers.csv").exists():
                import_insurers_csv(session, seed / "insurers.csv")
            counts = import_az_directory(
                session,
                Path(os.environ.get("AZ_DATA_DIR", str(ROOT / "data" / "az-data"))),
                price_hospital_id=args.price_hospital_id,
            )
        else:
            counts = import_sample_directory(session, data_dir)
        ensure_indexes(session)
        session.commit()
        print("Import counts:", counts)
    except Exception as e:
        session.rollback()
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
