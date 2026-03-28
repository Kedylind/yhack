"""Import pipeline tests against sample fixtures."""

from pathlib import Path

import mongomock
import pytest

from app.services.csv_import import import_sample_directory, ensure_indexes

SAMPLES = Path(__file__).resolve().parent.parent.parent / "data" / "samples"


@pytest.fixture
def db():
    client = mongomock.MongoClient()
    return client["test_boston_gi"]


def test_import_sample_providers_prices_counts(db):
    counts = import_sample_directory(db, SAMPLES)
    assert counts["providers"] == 3
    assert counts["procedures"] == 3
    assert counts["prices"] == 4
    assert counts["insurers"] == 2

    p = db["providers"].find_one({"npi": "1234567890"})
    assert p is not None
    assert p["name"] == "Boston GI Associates"
    assert p["location"]["type"] == "Point"
    assert p["location"]["coordinates"] == [-71.0721, 42.3346]
    assert "Gastroenterology" in p["specialties"]

    price = db["prices"].find_one(
        {"provider_id": "1234567890", "bundle_id": "colonoscopy_screening"}
    )
    assert price is not None
    assert price["min_rate_cents"] == 500000
    assert price["payer"] == "BCBS_MA"


def test_ensure_indexes_does_not_raise(db):
    import_sample_directory(db, SAMPLES)
    ensure_indexes(db)
