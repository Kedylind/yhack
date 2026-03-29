"""Re-import all data (GI + derm) to MongoDB.

Usage:
    # Local MongoDB
    uv run python scripts/reimport_all.py

    # Atlas
    MONGODB_URI="mongodb+srv://..." uv run python scripts/reimport_all.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from pymongo import MongoClient
from app.services.csv_import import import_az_directory, ensure_indexes

MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGODB_DB_NAME", "boston_gi_demo")
AZ_DATA = Path(__file__).resolve().parent.parent / "data" / "az-data"


def main():
    print(f"Connecting to: {MONGO_URI[:40]}...")
    print(f"Database: {DB_NAME}")
    print(f"Data dir: {AZ_DATA}")
    print(f"Files: {[f.name for f in AZ_DATA.iterdir() if f.suffix == '.csv']}")
    print()

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Drop and reimport for clean state
    for col in ["providers", "hospital_rates", "prices"]:
        count = db[col].count_documents({})
        db[col].drop()
        print(f"Dropped {col} ({count} docs)")

    counts = import_az_directory(db, AZ_DATA, price_hospital_id="bmc")
    ensure_indexes(db)

    print()
    print("=== Import Results ===")
    for k, v in counts.items():
        print(f"  {k}: {v}")

    print()
    print("=== Verification ===")
    for col in ["providers", "hospital_rates", "prices"]:
        print(f"  {col}: {db[col].count_documents({})} docs")

    gi = db["providers"].count_documents({"specialties": "Gastroenterology"})
    derm = db["providers"].count_documents({"specialties": "Dermatology"})
    print(f"  GI providers: {gi}, Derm providers: {derm}")

    # Spot checks
    r = db["hospital_rates"].find_one({"hospital_id": "bmc", "cpt": "45378"})
    if r:
        print(
            f"\n  BMC colonoscopy: bcbs=${r.get('bcbs_price')}, hp=${r.get('harvard_pilgrim_price')}"
        )

    r = db["hospital_rates"].find_one({"hospital_id": "bmc", "cpt": "11102"})
    if r:
        print(
            f"  BMC skin biopsy: bcbs=${r.get('bcbs_price')}, hp=${r.get('harvard_pilgrim_price')}"
        )

    client.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
