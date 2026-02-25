import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from collections.abc import AsyncIterator
from typing import Annotated, Any
from fastapi import Depends
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from platformdirs import user_data_dir

from .models import (
    provider as provider_models,
    agent as agent_models,
    workspace as workspace_models,
    toolset as toolset_models,
)
# this unused import is necessary to alembic
from . import models
from src.common import APP_NAME

data_dir = Path(user_data_dir(APP_NAME, appauthor=False, ensure_exists=True))
db_path = data_dir / "sqlite.db"

DB_ASYNC_URL = f"sqlite+aiosqlite:///{db_path}"
DB_SYNC_URL = f"sqlite:///{db_path}"

engine = create_async_engine(DB_ASYNC_URL)
AsyncSessionLocal = async_sessionmaker(engine,
                                       autoflush=False,
                                       autocommit=False,
                                       expire_on_commit=False)

async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except asyncio.CancelledError:
            pass
        except Exception:
            await session.rollback()
            raise
type DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
db_context = asynccontextmanager(get_db_session)

@event.listens_for(engine.sync_engine, "connect")
def on_connect(dbapi_conn, _):
    dbapi_conn.execute("PRAGMA journal_mode=WAL")
    dbapi_conn.execute("PRAGMA busy_timeout=3000")

async def init_initial_data() -> None:
    async with AsyncSessionLocal.begin() as session:
        await provider_models.init(session)
        await agent_models.init(session)
        await workspace_models.init(session)
        await toolset_models.init(session)

async def migrate_db() -> None:
    def get_base_dir() -> str:
        import sys, os
        from src import IS_DEV
        if IS_DEV:
            return str(Path(os.path.abspath(__file__)).parent.parent.parent)
        else:
            return sys._MEIPASS

    from alembic.config import Config
    from alembic import command

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("script_location", f"{get_base_dir()}/src/db/alembic")
    alembic_cfg.set_main_option("sqlalchemy.url", DB_SYNC_URL)
    command.upgrade(alembic_cfg, "head")
    await init_initial_data()
