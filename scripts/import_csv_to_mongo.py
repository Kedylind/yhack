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

from app.services.csv_import import ensure_indexes, import_sample_directory  # noqa: E402


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
    args = parser.parse_args()
    data_dir = Path(args.data_dir)
    if not data_dir.is_dir():
        print(f"Error: data directory not found: {data_dir}", file=sys.stderr)
        return 1

    if args.dry_run:
        import mongomock  # noqa: PLC0415

        db = mongomock.MongoClient()["dry_import"]
        counts = import_sample_directory(db, data_dir)
        ensure_indexes(db)
        print("dry-run counts:", counts)
        return 0

    client = MongoClient(args.mongodb_uri)
    db = client[args.db_name]
    counts = import_sample_directory(db, data_dir)
    ensure_indexes(db)
    for k, v in counts.items():
        print(f"{k}: {v} documents upserted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
