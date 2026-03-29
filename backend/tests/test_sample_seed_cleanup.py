"""sample_seed cleanup removes demo providers and their prices only."""

from pathlib import Path

import mongomock
import pytest

from app.services.csv_import import import_sample_directory
from app.services.sample_seed_cleanup import remove_sample_seed_providers_and_prices

SAMPLES = Path(__file__).resolve().parent.parent.parent / "data" / "samples"


@pytest.fixture
def db():
    client = mongomock.MongoClient()
    return client["test_cleanup"]


def test_remove_sample_seed_after_import(db):
    import_sample_directory(db, SAMPLES)
    assert db["providers"].count_documents({"source": "sample_seed"}) == 3
    assert db["prices"].count_documents({"provider_id": "1234567890"}) >= 1

    out = remove_sample_seed_providers_and_prices(db)
    assert out["providers_deleted"] == 3
    assert out["prices_deleted"] == 4

    assert db["providers"].count_documents({}) == 0
    assert db["prices"].count_documents({"provider_id": "1234567890"}) == 0
    assert db["procedures"].count_documents({}) == 3
    assert db["insurers"].count_documents({}) == 2
