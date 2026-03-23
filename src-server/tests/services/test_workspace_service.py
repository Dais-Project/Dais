import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import agent as agent_models
from src.db.models import toolset as toolset_models
from src.schemas import workspace as workspace_schemas
from src.services.exceptions import ServiceErrorCode
from src.services.workspace import WorkspaceNotFoundError, WorkspaceService


class TestWorkspaceService:
    @pytest.mark.asyncio
    async def test_get_workspace_by_id_not_found(self, db_session: AsyncSession):
        service = WorkspaceService(db_session)

        with pytest.raises(WorkspaceNotFoundError) as exc_info:
            await service.get_workspace_by_id(999)

        assert exc_info.value.error_code == ServiceErrorCode.WORKSPACE_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_workspace_with_relations(self, db_session: AsyncSession, seeded_data):
        service = WorkspaceService(db_session)
        data = workspace_schemas.WorkspaceCreate(
            name="Workspace A",
            directory="/tmp/workspace-a",
            instruction="Instruction A",
            usable_agent_ids=[seeded_data.agent.id],
            usable_tool_ids=[seeded_data.tool.id],
        )

        workspace = await service.create_workspace(data)

        assert workspace.name == "Workspace A"
        assert workspace.directory == "/tmp/workspace-a"
        assert workspace.instruction == "Instruction A"
        assert {agent.id for agent in workspace.usable_agents} == {seeded_data.agent.id}
        assert {tool.id for tool in workspace.usable_tools} == {seeded_data.tool.id}

    @pytest.mark.asyncio
    async def test_update_workspace_updates_fields_and_relations(
        self,
        db_session: AsyncSession,
        seeded_data,
    ):
        service = WorkspaceService(db_session)
        initial = await service.create_workspace(
            workspace_schemas.WorkspaceCreate(
                name="Workspace A",
                directory="/tmp/workspace-a",
                instruction="Instruction A",
                usable_agent_ids=[seeded_data.agent.id],
                usable_tool_ids=[seeded_data.tool.id],
            )
        )

        new_tool = toolset_models.Tool(
            name="Echo 2",
            internal_key="echo-2",
            description="Echo tool 2",
            is_enabled=True,
            auto_approve=False,
        )
        new_toolset = toolset_models.Toolset(
            name="Built-in 2",
            internal_key="built-in-2",
            type=toolset_models.ToolsetType.BUILT_IN,
            params=None,
            is_enabled=True,
            tools=[new_tool],
        )
        new_agent = agent_models.Agent(
            name="Agent B",
            icon_name="bot",
            instruction="Instruction B",
            model_id=None,
            usable_tools=[new_tool],
        )
        db_session.add_all([new_toolset, new_agent])
        await db_session.flush()

        updated = await service.update_workspace(
            initial.id,
            workspace_schemas.WorkspaceUpdate(
                name="Workspace B",
                directory="/tmp/workspace-b",
                instruction="Instruction B",
                usable_agent_ids=[new_agent.id],
                usable_tool_ids=[new_tool.id],
            ),
        )

        assert updated.name == "Workspace B"
        assert updated.directory == "/tmp/workspace-b"
        assert updated.instruction == "Instruction B"
        assert {agent.id for agent in updated.usable_agents} == {new_agent.id}
        assert {tool.id for tool in updated.usable_tools} == {new_tool.id}

    @pytest.mark.asyncio
    async def test_delete_workspace_removes_entity(self, db_session: AsyncSession, seeded_data):
        service = WorkspaceService(db_session)
        workspace = await service.create_workspace(
            workspace_schemas.WorkspaceCreate(
                name="Workspace A",
                directory="/tmp/workspace-a",
                instruction="Instruction A",
                usable_agent_ids=[seeded_data.agent.id],
                usable_tool_ids=[seeded_data.tool.id],
            )
        )

        await service.delete_workspace(workspace.id)
        await db_session.flush()
        db_session.expunge_all()

        with pytest.raises(WorkspaceNotFoundError):
            await service.get_workspace_by_id(workspace.id)
