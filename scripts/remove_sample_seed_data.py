#!/usr/bin/env python3
"""Remove data/samples demo providers and their prices from MongoDB (keeps az_mvp data)."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from pymongo import MongoClient  # noqa: E402

from app.services.sample_seed_cleanup import remove_sample_seed_providers_and_prices  # noqa: E402


def main() -> int:
    env_path = BACKEND / ".env"
    if env_path.is_file():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path)
        except ImportError:
            pass

    parser = argparse.ArgumentParser(
        description="Delete sample_seed providers and sample NPI price rows from MongoDB",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report counts only (mongomock; no real Mongo writes)",
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

    if args.dry_run:
        import mongomock  # noqa: PLC0415

        from app.services.csv_import import import_sample_directory  # noqa: E402

        db = mongomock.MongoClient()["dry_cleanup"]
        import_sample_directory(db, ROOT / "data" / "samples")
        before_p = db["providers"].count_documents({})
        before_pr = db["prices"].count_documents({})
        out = remove_sample_seed_providers_and_prices(db)
        assert db["providers"].count_documents({"source": "sample_seed"}) == 0
        assert db["providers"].count_documents({}) == 0
        print("dry-run:", out, f"(before: {before_p} providers, {before_pr} prices)")
        return 0

    client = MongoClient(args.mongodb_uri)
    db = client[args.db_name]
    out = remove_sample_seed_providers_and_prices(db)
    for k, v in out.items():
        print(f"{k}: {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
