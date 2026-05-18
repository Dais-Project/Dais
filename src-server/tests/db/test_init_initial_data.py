from typing import AsyncGenerator
import pytest
import pytest_asyncio
from sqlalchemy import event
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import src.db as db_module
from src.db.models import Base
from src.db.models import agent as agent_models
from src.db.models import provider as provider_models
from src.db.models import skill as skill_models
from src.db.models import toolset as toolset_models
from src.db.models import workspace as workspace_models
from src.services.agent import AgentService
from src.services.workspace import WorkspaceService


@pytest_asyncio.fixture
async def db_engine() -> AsyncGenerator[AsyncEngine]:
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
async def test_session_factory(db_engine: AsyncEngine):
    return async_sessionmaker(
        db_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


@pytest.mark.integration
class TestInitInitialData:
    @pytest.mark.asyncio
    async def test_init_initial_data_creates_default_records(self, monkeypatch: pytest.MonkeyPatch, test_session_factory):
        monkeypatch.setattr(db_module, "AsyncSessionLocal", test_session_factory)

        await db_module.init_initial_data()

        async with test_session_factory() as session:
            providers = (await session.scalars(select(provider_models.Provider))).all()
            models = (await session.scalars(select(provider_models.LlmModel))).all()
            toolsets = (await session.scalars(select(toolset_models.Toolset))).all()
            tools = (await session.scalars(select(toolset_models.Tool))).all()
            agents = (
                await session.scalars(
                    select(agent_models.Agent)
                    .order_by(agent_models.Agent.id.asc())
                    .options(*AgentService.relations())
                )
            ).all()
            workspaces = (
                await session.scalars(
                    select(workspace_models.Workspace)
                    .order_by(workspace_models.Workspace.id.asc())
                    .options(*WorkspaceService.relations())
                )
            ).all()
            skills = (await session.scalars(select(skill_models.Skill).order_by(skill_models.Skill.id.asc()))).all()

            provider = providers[0]
            model = models[0]
            workspace = workspaces[0]
            software_engineer = next(agent for agent in agents if agent.name == "Software Engineer")

            assert len(providers) == 1
            assert provider.name == "OpenAI"
            assert provider.base_url == "https://api.openai.com/v1"
            assert provider.api_key == "sk-"

            assert len(models) == 1
            assert model.name == "gpt-5"
            assert model.context_size == 128_000
            assert model.provider_id == provider.id

            assert len(toolsets) == 6
            assert len(tools) > 0

            assert {agent.name for agent in agents} == {
                "Daily Assistant",
                "Terminal Interpreter",
                "Software Engineer",
            }
            assert all(agent.description for agent in agents)
            assert all(agent.model_id == model.id for agent in agents)
            assert len(software_engineer.usable_tools) == len(tools)

            assert len(workspaces) == 1
            assert workspace.name == "User Directory"
            assert workspace.directory == "~"
            assert workspace.instruction == ""
            assert {agent.id for agent in workspace.usable_agents} == {agent.id for agent in agents}
            assert {tool.id for tool in workspace.usable_tools} == {tool.id for tool in tools}

            assert [skill.name for skill in skills] == [
                "skill writer",
                "workspace instructions writer",
            ]
            assert all(skill.is_enabled for skill in skills)

    @pytest.mark.asyncio
    async def test_init_initial_data_is_idempotent(self, monkeypatch: pytest.MonkeyPatch, test_session_factory):
        monkeypatch.setattr(db_module, "AsyncSessionLocal", test_session_factory)

        await db_module.init_initial_data()
        await db_module.init_initial_data()

        async with test_session_factory() as session:
            provider_count = await session.scalar(select(func.count()).select_from(provider_models.Provider))
            model_count = await session.scalar(select(func.count()).select_from(provider_models.LlmModel))
            toolset_count = await session.scalar(select(func.count()).select_from(toolset_models.Toolset))
            tool_count = await session.scalar(select(func.count()).select_from(toolset_models.Tool))
            agent_count = await session.scalar(select(func.count()).select_from(agent_models.Agent))
            workspace_count = await session.scalar(select(func.count()).select_from(workspace_models.Workspace))
            skill_count = await session.scalar(select(func.count()).select_from(skill_models.Skill))

            assert provider_count == 1
            assert model_count == 1
            assert toolset_count == 6
            assert tool_count > 0
            assert agent_count == 3
            assert workspace_count == 1
            assert skill_count == 2
