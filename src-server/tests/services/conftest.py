from collections.abc import AsyncIterator
from typing import NamedTuple

import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from src.db.models import Base
from src.db.models import agent as agent_models
from src.db.models import toolset as toolset_models


class SeededData(NamedTuple):
    toolset: toolset_models.Toolset
    tool: toolset_models.Tool
    agent: agent_models.Agent


@pytest_asyncio.fixture
async def db_engine() -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    session_factory = async_sessionmaker(
        db_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def seeded_data(db_session: AsyncSession) -> SeededData:
    tool = toolset_models.Tool(
        name="Echo",
        internal_key="echo",
        description="Echo tool",
        is_enabled=True,
        auto_approve=False,
    )
    toolset = toolset_models.Toolset(
        name="Built-in",
        internal_key="built-in",
        type=toolset_models.ToolsetType.BUILT_IN,
        params=None,
        is_enabled=True,
        tools=[tool],
    )
    agent = agent_models.Agent(
        name="Agent A",
        icon_name="bot",
        instruction="Instruction A",
        model_id=None,
        usable_tools=[tool],
    )
    db_session.add_all([toolset, agent])
    await db_session.flush()
    return SeededData(toolset=toolset, tool=tool, agent=agent)
