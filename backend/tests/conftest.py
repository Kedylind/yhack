from pathlib import Path

import mongomock
import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.main import create_app
from app.services.csv_import import import_sample_directory

SAMPLES = Path(__file__).resolve().parent.parent.parent / "data" / "samples"


@pytest.fixture
def empty_db():
    client = mongomock.MongoClient()
    return client["test_api"]


@pytest.fixture
def seeded_db(empty_db):
    import_sample_directory(empty_db, SAMPLES)
    return empty_db


@pytest.fixture
def client(seeded_db):
    def _override():
        yield seeded_db

    app = create_app()
    app.dependency_overrides[get_db] = _override
    with TestClient(app) as tc:
        yield tc
    app.dependency_overrides.clear()
