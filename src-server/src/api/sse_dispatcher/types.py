from typing import Annotated, Literal
from pydantic import BaseModel, Discriminator

class TaskTitleUpdatedEvent(BaseModel):
    event_id: Literal["TASK_TITLE_UPDATED"] = "TASK_TITLE_UPDATED"
    task_id: int
    title: str

class McpToolsetConnectedEvent(BaseModel):
    event_id: Literal["MCP_TOOLSET_CONNECTED"] = "MCP_TOOLSET_CONNECTED"
    toolset_id: int

type DispatcherEventData = Annotated[
    TaskTitleUpdatedEvent | McpToolsetConnectedEvent,
    Discriminator("event_id")
]
