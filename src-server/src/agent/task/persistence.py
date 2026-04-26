import time
from dais_sdk.types import Message
from src.db import db_context
from src.db.models import tasks as task_models
from src.schemas.tasks import task as task_schemas
from src.services.task import TaskService


class TaskPersistence:
    async def persist(self,
                      id: int,
                      messages: list[Message],
                      usage: task_models.TaskUsage):
        update = task_schemas.TaskUpdate(
            title=None, agent_id=None,
            messages=messages,
            usage=usage,
            last_run_at=int(time.time())
        )
        async with db_context() as db_session:
            return await TaskService(db_session).update_task(id, update)
