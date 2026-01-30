from abc import ABC
from ..db import SessionLocal

class ServiceBase(ABC):
    def __init__(self):
        self._db_session = SessionLocal()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._db_session.close()
