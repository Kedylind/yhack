from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_evaluate_endpoint_returns_recommendations() -> None:
    payload = {
        "zip_code": "10001",
        "age": 25,
        "plan_id": "acme_hmo_basic",
        "category": "acne",
        "answers": {
            "severity": "mild",
            "duration_weeks": 6,
            "first_time_visit": True,
            "wants_cosmetic_treatment": False,
            "facial_swelling": False,
            "fever": False,
            "rapidly_worsening": False,
            "pregnant": False,
        },
    }

    response = client.post("/api/v1/evaluate", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["supported"] is True
    assert body["red_flag"]["triggered"] is False
    assert len(body["recommendations"]) >= 1
