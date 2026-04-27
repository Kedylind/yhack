"""Import pipeline tests against sample fixtures (PostgreSQL)."""

from pathlib import Path

import pytest

from app.services.csv_import import import_az_directory, import_sample_directory
from app.db.tables import Provider, HospitalRate

SAMPLES = Path(__file__).resolve().parent.parent.parent / "data" / "samples"
AZ_DATA = Path(__file__).resolve().parent.parent.parent / "data" / "az-data"


def test_import_sample_providers_prices_counts(db_session):
    counts = import_sample_directory(db_session, SAMPLES)
    assert counts["providers"] > 0
    assert counts["procedures"] > 0
    assert counts["prices"] > 0
    assert counts["insurers"] > 0

    p = db_session.query(Provider).filter_by(npi="1811988488").first()
    assert p is not None
    assert p.name == "Diane Abraczinskas"
    assert "Gastroenterology" in p.specialties


def test_import_az_mvp_providers_and_hospital_rates(db_session):
    if not AZ_DATA.exists():
        pytest.skip("az-data directory not available")
    counts = import_az_directory(db_session, AZ_DATA, price_hospital_id="bmc")
    assert counts.get("providers_gi", 0) > 0 or counts.get("providers", 0) > 0
    assert counts.get("hospital_rates_gi", 0) > 0 or counts.get("hospital_rates", 0) > 0

    p = db_session.query(Provider).filter_by(source="az_mvp").first()
    assert p is not None
    assert p.lat is not None
    assert p.lng is not None

    hr = db_session.query(HospitalRate).filter_by(hospital_id="bmc", cpt="45378").first()
    if hr is not None:
        assert hr.de_identified_min is not None
