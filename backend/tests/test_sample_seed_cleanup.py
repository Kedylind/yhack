"""sample_seed cleanup removes demo providers and their prices only."""

from pathlib import Path

from sqlalchemy import func, select

from app.db.tables import Insurer, Price, Procedure, Provider
from app.services.csv_import import import_sample_directory
from app.services.sample_seed_cleanup import remove_sample_seed_providers_and_prices

SAMPLES = Path(__file__).resolve().parent.parent.parent / "data" / "samples"


def test_remove_sample_seed_after_import(db_session):
    import_sample_directory(db_session, SAMPLES)
    assert (
        db_session.scalar(
            select(func.count()).select_from(Provider).where(Provider.source == "sample_seed")
        )
        == 3
    )
    assert (
        db_session.scalar(
            select(func.count()).select_from(Price).where(Price.provider_id == "1234567890")
        )
        >= 1
    )

    out = remove_sample_seed_providers_and_prices(db_session)
    db_session.commit()
    assert out["providers_deleted"] == 3
    assert out["prices_deleted"] == 4

    assert db_session.scalar(select(func.count()).select_from(Provider)) == 121
    assert (
        db_session.scalar(
            select(func.count()).select_from(Price).where(Price.provider_id == "1234567890")
        )
        == 0
    )
    assert db_session.scalar(select(func.count()).select_from(Procedure)) == 3
    assert db_session.scalar(select(func.count()).select_from(Insurer)) == 2
