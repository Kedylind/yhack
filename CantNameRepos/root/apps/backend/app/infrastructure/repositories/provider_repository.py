from app.infrastructure.db.mongodb import get_database


class ProviderRepository:
    def __init__(self) -> None:
        self.collection = get_database()["providers"]

    def find_by_network_and_care_setting(
        self,
        network: str,
        care_setting: str,
        limit: int = 5,
    ) -> list[dict]:
        cursor = self.collection.find(
            {
                "networks": network,
                "care_setting": care_setting,
            }
        ).limit(limit)

        return list(cursor)
