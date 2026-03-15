import time
from typing import TYPE_CHECKING
from loguru import logger
from dais_sdk.types import Message, UserMessage
from ....db import db_context
from ....services.task import TaskService
from ....schemas import task as task_schemas
from ....agent.prompts import create_one_turn_llm, TitleSummarization
from ....settings import use_app_setting_manager
from ....api.sse_dispatcher.types import TaskTitleUpdatedEvent

if TYPE_CHECKING:
    from ....api.sse_dispatcher import SseDispatcher

_logger = logger.bind(name="TaskBackgroundRoute")

async def summarize_title_in_background(
    task_id: int,
    context: list[Message],
    sse_dispatcher: SseDispatcher,
):
    settings = use_app_setting_manager().settings
    if settings.flash_model is None: return
    try:
        llm = await create_one_turn_llm(settings.flash_model)
        summarizer = TitleSummarization(llm)
        assert isinstance(context[0], UserMessage)
        title = await summarizer(context[0].content)
    except Exception:
        _logger.exception("Failed to request title summarization for task {}", task_id)
        return

    if title is None:
        _logger.warning("Generate an empty title for task {}, skipping...", task_id)
        return

    try:
        async with db_context() as db_session:
            update_data = task_schemas.TaskUpdate(title=title,
                messages=None, agent_id=None, last_run_at=int(time.time()), usage=None)
            await TaskService(db_session).update_task(task_id, update_data)
    except Exception:
        _logger.exception("Failed to update task {} with title '{}'", task_id, title)

    await sse_dispatcher.send(TaskTitleUpdatedEvent(task_id=task_id, title=title))
