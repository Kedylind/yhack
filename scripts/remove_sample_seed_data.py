#!/usr/bin/env python3
"""Remove data/samples demo providers and their prices from PostgreSQL (keeps az_mvp data)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from sqlalchemy.orm import Session  # noqa: E402

from app.db.postgres import get_session_factory  # noqa: E402
from app.services.sample_seed_cleanup import remove_sample_seed_providers_and_prices  # noqa: E402


def main() -> int:
    env_path = BACKEND / ".env"
    if env_path.is_file():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path)
        except ImportError:
            pass

    factory = get_session_factory()
    session: Session = factory()
    try:
        out = remove_sample_seed_providers_and_prices(session)
        session.commit()
        for k, v in out.items():
            print(f"{k}: {v}")
    except Exception as e:
        session.rollback()
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
