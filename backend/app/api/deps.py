from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.postgres import get_db


def get_db_session() -> Generator[Session, None, None]:
    yield from get_db()


DbDep = Annotated[Session, Depends(get_db_session)]
