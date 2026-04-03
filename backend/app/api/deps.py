from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.auth_deps import AuthUser, get_current_user_required
from app.db.postgres import get_db


def get_db_session() -> Generator[Session, None, None]:
    yield from get_db()


def get_db_session_after_auth(
    _auth: AuthUser = Depends(get_current_user_required),
) -> Generator[Session, None, None]:
    """Open a DB session only after the user is authenticated (avoids DB for 401 paths)."""
    yield from get_db()


DbDep = Annotated[Session, Depends(get_db_session)]
DbDepAuth = Annotated[Session, Depends(get_db_session_after_auth)]
