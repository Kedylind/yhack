"""Import pipeline tests against sample fixtures."""

from pathlib import Path

import pytest
from sqlalchemy import select

from app.db.tables import HospitalRate, Price, Provider
from app.services.csv_import import (
    ensure_indexes,
    import_az_directory,
    import_sample_directory,
)

SAMPLES = Path(__file__).resolve().parent.parent.parent / "data" / "samples"
AZ_DATA = Path(__file__).resolve().parent.parent.parent / "data" / "az-data"


def test_import_sample_providers_prices_counts(db_session):
    counts = import_sample_directory(db_session, SAMPLES)
    assert counts["providers"] == 124
    assert counts["procedures"] == 3
    assert counts["prices"] == 4
    assert counts["insurers"] == 2

    p = db_session.scalar(select(Provider).where(Provider.npi == "1811988488"))
    assert p is not None
    assert p.name == "Diane Abraczinskas"
    assert "Gastroenterology" in (p.specialties or [])
    assert p.hospital == "Massachusetts General Hospital"

    price = db_session.scalar(
        select(Price).where(
            Price.provider_id == "1234567890",
            Price.bundle_id == "colonoscopy_screening",
        )
    )
    assert price is not None
    assert price.min_rate_cents == 500000
    assert price.payer == "BCBS_MA"


def test_ensure_indexes_does_not_raise(db_session):
    import_sample_directory(db_session, SAMPLES)
    ensure_indexes(db_session)


def test_import_az_mvp_providers_and_hospital_rates(db_session):
    counts = import_az_directory(db_session, AZ_DATA, price_hospital_id="bmc")
    assert counts.get("providers", 0) > 0
    assert counts.get("hospital_rates", 0) > 0
    assert counts.get("prices", 0) > 0

    p = db_session.scalar(select(Provider).where(Provider.source == "az_mvp"))
    assert p is not None
    assert p.lat is not None and p.lng is not None

    hr = db_session.scalar(
        select(HospitalRate).where(
            HospitalRate.hospital_id == "bmc",
            HospitalRate.cpt == "45378",
        )
    )
    assert hr is not None
    assert hr.de_identified_min is not None

    npi = p.npi
    price = db_session.scalar(
        select(Price).where(
            Price.provider_id == npi,
            Price.bundle_id == "colonoscopy_screening",
            Price.source == "az_mvp",
            Price.payer == "BCBS_MA",
        )
    )
    assert price is not None
    assert price.min_rate_cents > 0
    assert price.mvp_hospital_id == "bmc"
