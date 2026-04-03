"""Insurance dropdown options derived from hospital_rates."""

from sqlalchemy.orm import Session

from app.db.tables import HospitalRate
from app.services.insurance_options import build_insurance_options


def test_insurance_options_empty_collection(db_session: Session):
    out = build_insurance_options(db_session)
    assert out["insurers"] == []
    assert out["bcbs_plan_options"] == []


def test_insurance_options_from_rates(db_session: Session):
    db_session.add_all(
        [
            HospitalRate(
                id="bmc:45378",
                hospital_id="bmc",
                hospital_name="",
                neighborhood="",
                system="",
                data_completeness="",
                cpt="45378",
                cpt_desc="",
                bcbs_price=100.0,
                aetna_price=200.0,
                bcbs_plan=" HMO Blue ",
            ),
            HospitalRate(
                id="bmc:45380",
                hospital_id="bmc",
                hospital_name="",
                neighborhood="",
                system="",
                data_completeness="",
                cpt="45380",
                cpt_desc="",
                harvard_pilgrim_price=50.0,
                uhc_price=75.0,
                bcbs_plan="PPO Blue",
            ),
        ]
    )
    db_session.commit()
    out = build_insurance_options(db_session)
    keys = {i["key"] for i in out["insurers"]}
    assert keys == {"bcbs", "aetna", "harvard_pilgrim", "uhc"}
    assert out["bcbs_plan_options"] == ["HMO Blue", "PPO Blue"]
