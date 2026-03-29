"""Import pipeline tests against sample fixtures."""

from pathlib import Path

import mongomock
import pytest

from app.services.csv_import import (
    ensure_indexes,
    import_az_directory,
    import_sample_directory,
)

SAMPLES = Path(__file__).resolve().parent.parent.parent / "data" / "samples"
AZ_DATA = Path(__file__).resolve().parent.parent.parent / "data" / "az-data"


@pytest.fixture
def db():
    client = mongomock.MongoClient()
    return client["test_boston_gi"]


def test_import_sample_providers_prices_counts(db):
    counts = import_sample_directory(db, SAMPLES)
    assert counts["providers"] == 121
    assert counts["procedures"] == 3
    assert counts["prices"] == 4
    assert counts["insurers"] == 2

    p = db["providers"].find_one({"npi": "1811988488"})
    assert p is not None
    assert p["name"] == "Diane Abraczinskas"
    assert p["location"]["type"] == "Point"
    assert "Gastroenterology" in p["specialties"]
    assert p["hospital"] == "Massachusetts General Hospital"

    price = db["prices"].find_one(
        {"provider_id": "1234567890", "bundle_id": "colonoscopy_screening"}
    )
    assert price is not None
    assert price["min_rate_cents"] == 500000
    assert price["payer"] == "BCBS_MA"


def test_ensure_indexes_does_not_raise(db):
    import_sample_directory(db, SAMPLES)
    ensure_indexes(db)


def test_import_az_mvp_providers_and_hospital_rates(db):
    counts = import_az_directory(db, AZ_DATA, price_hospital_id="bmc")
    assert counts.get("providers", 0) > 0
    assert counts.get("hospital_rates", 0) > 0
    assert counts.get("prices", 0) > 0

    p = db["providers"].find_one({"source": "az_mvp"})
    assert p is not None
    assert p["location"]["type"] == "Point"
    assert len(p["location"]["coordinates"]) == 2

    hr = db["hospital_rates"].find_one({"hospital_id": "bmc", "cpt": "45378"})
    assert hr is not None
    assert hr["de_identified_min"] is not None

    npi = p["npi"]
    price = db["prices"].find_one(
        {
            "provider_id": npi,
            "bundle_id": "colonoscopy_screening",
            "source": "az_mvp",
            "payer": "BCBS_MA",
        }
    )
    assert price is not None
    assert price["min_rate_cents"] > 0
    assert price["mvp_hospital_id"] == "bmc"
