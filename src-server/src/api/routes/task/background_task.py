import time
from typing import TYPE_CHECKING, TypedDict
from loguru import logger
from .message import TaskMessage, UserMessage
from ....db import db_context
from ....services.task import TaskService
from ....schemas import task as task_schemas
from ....agent.prompts import TITLE_SUMMARIZATION_INSTRUCTION
from ....agent.temp_generation import TempGeneration
from ....settings import use_app_setting_manager

if TYPE_CHECKING:
    from ....api.lifespan import AppState

_logger = logger.bind(name="TaskBackgroundRoute")

class TaskTitleUpdatedEvent(TypedDict):
    task_id: int
    title: str

async def summarize_title_in_background(
    task_id: int,
    context: list[TaskMessage],
    app_state: AppState,
):
    from ....api.sse_dispatcher import DispatcherEvent

    settings = use_app_setting_manager().settings
    if settings.flash_model is None: return
    try:
        temp_generation = await TempGeneration.create(TITLE_SUMMARIZATION_INSTRUCTION, settings.flash_model)
        assert isinstance(context[0], UserMessage)
        title = await temp_generation.generate(context[0].content)
    except Exception:
        _logger.exception("Failed to request title summarization for task {}", task_id)
        return

    try:
        async with db_context() as session:
            update_data = task_schemas.TaskUpdate(title=title,
                messages=None, agent_id=None, last_run_at=int(time.time()), usage=None)
            await TaskService(session).update_task(task_id, update_data)
    except Exception:
        _logger.exception("Failed to update task {} with title '{}'", task_id, title)

    await app_state["sse_dispatcher"].send(
        event=DispatcherEvent.TASK_TITLE_UPDATED,
        data=TaskTitleUpdatedEvent(task_id=task_id, title=title),
    )
