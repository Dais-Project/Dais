import uuid
from collections.abc import AsyncIterator
from typing import NamedTuple

import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from dais_sdk.providers import LlmProviders
from dais_sdk.types import Message

from src.db.models import Base
from src.db.models import (
    agent as agent_models,
    provider as provider_models,
    skill as skill_models,
    tasks as task_models,
    toolset as toolset_models,
    workspace as workspace_models,
)
from src.schemas import skill as skill_schemas


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

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

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


# ---------------------------------------------------------------------------
# Factory fixtures
# ---------------------------------------------------------------------------

def _uid() -> str:
    """Return an 8-character unique suffix for internal_key fields."""
    return uuid.uuid4().hex[:8]


@pytest_asyncio.fixture
def tool_factory(db_session: AsyncSession):
    """Return an async factory that creates a Tool (with its owning Toolset)."""
    async def _create(
        *,
        name: str = "Tool",
        internal_key: str | None = None,
        description: str = "Test tool",
        is_enabled: bool = True,
        auto_approve: bool = False,
        toolset_name: str | None = None,
        toolset_internal_key: str | None = None,
    ) -> toolset_models.Tool:
        uid = _uid()
        toolset = toolset_models.Toolset(
            name=toolset_name or f"Toolset-{uid}",
            internal_key=toolset_internal_key or f"toolset-{uid}",
            type=toolset_models.ToolsetType.BUILT_IN,
            params=None,
            is_enabled=True,
            tools=[],
        )
        tool = toolset_models.Tool(
            name=name,
            internal_key=internal_key or f"tool-{uid}",
            description=description,
            is_enabled=is_enabled,
            auto_approve=auto_approve,
        )
        toolset.tools = [tool]
        db_session.add(toolset)
        await db_session.flush()
        return tool

    return _create


@pytest_asyncio.fixture
def toolset_factory(db_session: AsyncSession):
    """Return an async factory that creates a Toolset."""
    async def _create(
        *,
        name: str = "Toolset",
        internal_key: str | None = None,
        type: toolset_models.ToolsetType = toolset_models.ToolsetType.BUILT_IN,
        params=None,
        is_enabled: bool = True,
        tools: list[toolset_models.Tool] | None = None,
    ) -> toolset_models.Toolset:
        uid = _uid()
        toolset = toolset_models.Toolset(
            name=name,
            internal_key=internal_key or f"toolset-{uid}",
            type=type,
            params=params,
            is_enabled=is_enabled,
            tools=tools or [],
        )
        db_session.add(toolset)
        await db_session.flush()
        return toolset

    return _create


@pytest_asyncio.fixture
def agent_factory(db_session: AsyncSession):
    """Return an async factory that creates an Agent."""
    async def _create(
        *,
        name: str = "Agent",
        icon_name: str = "bot",
        instruction: str = "Test instruction",
        model_id: int | None = None,
        usable_tools: list[toolset_models.Tool] | None = None,
    ) -> agent_models.Agent:
        agent = agent_models.Agent(
            name=name,
            icon_name=icon_name,
            instruction=instruction,
            model_id=model_id,
            usable_tools=usable_tools or [],
        )
        db_session.add(agent)
        await db_session.flush()
        return agent

    return _create


@pytest_asyncio.fixture
def workspace_factory(db_session: AsyncSession):
    """Return an async factory that creates a Workspace."""
    async def _create(
        *,
        name: str = "Workspace",
        directory: str = "/tmp/workspace",
        instruction: str = "",
        usable_agents: list[agent_models.Agent] | None = None,
        usable_tools: list[toolset_models.Tool] | None = None,
        usable_skills: list[skill_models.Skill] | None = None,
    ) -> workspace_models.Workspace:
        workspace = workspace_models.Workspace(
            name=name,
            directory=directory,
            instruction=instruction,
            usable_agents=usable_agents or [],
            usable_tools=usable_tools or [],
            usable_skills=usable_skills or [],
        )
        db_session.add(workspace)
        await db_session.flush()
        return workspace

    return _create


@pytest_asyncio.fixture
def provider_factory(db_session: AsyncSession):
    """Return an async factory that creates a Provider."""
    async def _create(
        *,
        name: str = "Provider",
        type: LlmProviders = LlmProviders.OPENAI,
        base_url: str = "https://example.com",
        api_key: str = "sk-test",
        models: list[provider_models.LlmModel] | None = None,
    ) -> provider_models.Provider:
        provider = provider_models.Provider(
            name=name,
            type=type,
            base_url=base_url,
            api_key=api_key,
            models=models or [],
        )
        db_session.add(provider)
        await db_session.flush()
        return provider

    return _create


@pytest_asyncio.fixture
def llm_model_factory(db_session: AsyncSession):
    """Return an async factory that creates an LlmModel under an existing Provider."""
    async def _create(
        *,
        provider: provider_models.Provider,
        name: str = "model",
        context_size: int = 4096,
        capability: provider_models.LlmModelCapability | None = None,
    ) -> provider_models.LlmModel:
        model = provider_models.LlmModel(
            name=name,
            context_size=context_size,
            capability=capability or provider_models.LlmModelCapability(),
        )
        provider.models.append(model)
        await db_session.flush()
        return model

    return _create


@pytest_asyncio.fixture
def skill_factory(db_session: AsyncSession):
    """Return an async factory that creates a Skill."""
    async def _create(
        *,
        name: str | None = None,
        description: str = "",
        is_enabled: bool = True,
        content: str = "Skill content",
        resources: list[skill_schemas.SkillResourceBase] | None = None,
    ) -> skill_models.Skill:
        uid = _uid()
        resolved_resources = [
            skill_models.SkillResource(
                relative=r.relative,
                content=r.content,
            )
            for r in (resources or [])
        ]
        skill = skill_models.Skill(
            name=name or f"Skill-{uid}",
            hash=skill_models.Skill.compute_resources_hash(resolved_resources),
            description=description,
            is_enabled=is_enabled,
            content=content,
            resources=resolved_resources,
        )
        db_session.add(skill)
        await db_session.flush()
        return skill

    return _create


@pytest_asyncio.fixture
def task_factory(db_session: AsyncSession):
    """Return an async factory that creates a Task under an existing Workspace."""
    async def _create(
        *,
        workspace: workspace_models.Workspace,
        title: str = "Task",
        messages: list[Message] | None = None,
        agent: agent_models.Agent | None = None,
    ) -> task_models.Task:
        task = task_models.Task(
            title=title,
            messages=messages or [],
            agent_id=agent.id if agent else None,
            _workspace_id=workspace.id,
        )
        db_session.add(task)
        await db_session.flush()
        return task

    return _create
