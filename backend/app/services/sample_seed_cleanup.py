"""Remove demo CSV seed providers/prices that coexist with az_mvp imports."""

from __future__ import annotations

from pymongo.database import Database

# NPIs from data/samples/providers.csv (fake demo rows).
SAMPLE_SEED_NPIS = frozenset({"1234567890", "1234567891", "1234567892"})


def remove_sample_seed_providers_and_prices(db: Database) -> dict[str, int]:
    """
    Delete providers with source sample_seed and all price rows for sample NPIs.
    Leaves procedures, insurers, hospital_rates, and az_mvp rows untouched.
    """
    pr = db["providers"].delete_many({"source": "sample_seed"})
    pc = db["prices"].delete_many({"provider_id": {"$in": list(SAMPLE_SEED_NPIS)}})
    return {"providers_deleted": pr.deleted_count, "prices_deleted": pc.deleted_count}
