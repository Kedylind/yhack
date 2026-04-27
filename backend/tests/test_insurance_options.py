"""Insurance dropdown options derived from hospital_rates."""

import mongomock
import pytest

from app.services.insurance_options import build_insurance_options


@pytest.fixture
def db():
    client = mongomock.MongoClient()
    return client["test_insurance_opts"]


def test_insurance_options_empty_collection(db):
    out = build_insurance_options(db)
    assert out["insurers"] == []
    assert out["bcbs_plan_options"] == []
    assert out["plan_options_by_insurer"] == {}


def test_insurance_options_from_rates(db):
    db["hospital_rates"].insert_many(
        [
            {
                "_id": "bmc:45378",
                "hospital_id": "bmc",
                "cpt": "45378",
                "bcbs_price": 100.0,
                "aetna_price": 200.0,
                "bcbs_plan": " HMO Blue ",
                "aetna_plan": "Open Access",
            },
            {
                "_id": "bmc:45380",
                "hospital_id": "bmc",
                "cpt": "45380",
                "harvard_pilgrim_price": 50.0,
                "uhc_price": 75.0,
                "bcbs_plan": "PPO Blue",
                "aetna_plan": "Managed Choice",
                "uhc_plan": "Choice Plus",
            },
        ]
    )
    out = build_insurance_options(db)
    keys = {i["key"] for i in out["insurers"]}
    assert keys == {"bcbs", "aetna", "harvard_pilgrim", "uhc"}
    assert out["bcbs_plan_options"] == ["HMO Blue", "PPO Blue"]
    assert out["plan_options_by_insurer"]["bcbs"] == ["HMO Blue", "PPO Blue"]
    assert out["plan_options_by_insurer"]["aetna"] == ["Managed Choice", "Open Access"]
    assert out["plan_options_by_insurer"]["harvard_pilgrim"] == []
    assert out["plan_options_by_insurer"]["uhc"] == ["Choice Plus"]
