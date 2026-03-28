import json
from pathlib import Path

from app.infrastructure.db.mongodb import get_database
from app.infrastructure.config.settings import get_settings


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    settings = get_settings()
    db = get_database()

    backend_root = Path(__file__).resolve().parent.parent
    plans_path = backend_root / "seed" / "plans.json"
    providers_path = backend_root / "seed" / "providers.json"

    plans = load_json(plans_path)
    providers = load_json(providers_path)

    db["plans"].delete_many({})
    db["providers"].delete_many({})

    if plans:
        db["plans"].insert_many(plans)

    if providers:
        db["providers"].insert_many(providers)

    print("Mongo seed complete.")
    print(f"Inserted {len(plans)} plans")
    print(f"Inserted {len(providers)} providers")


if __name__ == "__main__":
    main()
