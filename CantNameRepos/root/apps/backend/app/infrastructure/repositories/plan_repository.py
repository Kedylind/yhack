from app.infrastructure.db.mongodb import get_database


class PlanRepository:
    def __init__(self) -> None:
        self.collection = get_database()["plans"]

    def find_by_id(self, plan_id: str) -> dict | None:
        return self.collection.find_one({"id": plan_id}, {"_id": 0})
