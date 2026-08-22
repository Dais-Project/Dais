from fastapi_pagination.ext.sqlalchemy import apaginate
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.models import agent as agent_models
from src.db.models import tasks as task_models
from src.schemas.tasks import task as task_schemas

from ..repository_base import RepositoryBase


class TaskRepository(RepositoryBase[task_models.Task]):
    @staticmethod
    def relations():
        return [
            selectinload(task_models.Task.agent),
            selectinload(task_models.Task.workspace),
        ]

    def get_query(self, workspace_id: int, query: str | None = None):
        stmt = (
            select(task_models.Task)
            .where(task_models.Task.workspace_id == workspace_id)
            .order_by(task_models.Task.id.desc())
        )
        if query:
            stmt = stmt.where(task_models.Task.title.ilike(f"%{query}%"))
        return stmt

    def get_recent_query(self):
        return select(task_models.Task).order_by(
            task_models.Task.last_run_at.desc(),
            task_models.Task.id.desc(),
        )

    async def get_page(self, workspace_id: int, query: str | None = None):
        stmt = self.get_query(workspace_id, query).add_columns(
            agent_models.Agent.icon_name
        ).outerjoin(task_models.Task.agent)
        return await apaginate(self._db_session, stmt, transformer=self._transform_page)

    async def get_recent_page(self):
        stmt = self.get_recent_query().add_columns(
            agent_models.Agent.icon_name
        ).outerjoin(task_models.Task.agent)
        return await apaginate(self._db_session, stmt, transformer=self._transform_page)

    async def get_by_id(self, task_id: int) -> task_models.Task | None:
        return await self._db_session.get(
            task_models.Task,
            task_id,
            options=self.relations(),
        )

    async def create(self, data: task_schemas.TaskCreate) -> task_models.Task:
        task = task_models.Task(
            _workspace_id=data.workspace_id,
            **data.model_dump(exclude={"workspace_id"}),
        )
        self._db_session.add(task)
        task_id = await self.flush_and_expunge(task)
        created = await self.get_by_id(task_id)
        assert created is not None
        return created

    async def update(
        self,
        task: task_models.Task,
        data: task_schemas.TaskUpdate,
    ) -> task_models.Task:
        if data.messages is not None:
            task.messages = data.messages
        self.apply_fields(task, data, exclude={"messages"})
        task_id = await self.flush_and_expunge(task)
        updated = await self.get_by_id(task_id)
        assert updated is not None
        return updated

    async def delete(self, task: task_models.Task):
        await self._db_session.delete(task)
        await self._db_session.flush()

    async def get_ids_before(self, cutoff: int) -> list[int]:
        ids = await self._db_session.scalars(
            select(task_models.Task.id).where(task_models.Task.last_run_at < cutoff)
        )
        return list(ids.all())

    @staticmethod
    def _transform_page(rows):
        return [
            task_schemas.TaskBrief.model_validate(
                {**task.__dict__, "icon_name": icon_name}
            )
            for task, icon_name in rows
        ]
