"""Remove demo CSV seed providers/prices that coexist with az_mvp imports."""

from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.tables import Price, Provider

# NPIs from data/samples/providers.csv (fake demo rows).
SAMPLE_SEED_NPIS = frozenset({"1234567890", "1234567891", "1234567892"})


def remove_sample_seed_providers_and_prices(session: Session) -> dict[str, int]:
    """
    Delete providers with source sample_seed and all price rows for sample NPIs.
    Leaves procedures, insurers, hospital_rates, and az_mvp rows untouched.
    """
    pr = session.execute(delete(Provider).where(Provider.source == "sample_seed"))
    pc = session.execute(delete(Price).where(Price.provider_id.in_(list(SAMPLE_SEED_NPIS))))
    return {
        "providers_deleted": pr.rowcount or 0,
        "prices_deleted": pc.rowcount or 0,
    }
