from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from pymongo.database import Database

from app.db.mongodb import get_database


def get_db() -> Generator[Database, None, None]:
    yield get_database()


DbDep = Annotated[Database, Depends(get_db)]
