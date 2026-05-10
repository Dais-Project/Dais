from functools import partial
from sqlalchemy.orm import (
    DeclarativeBase,
    relationship as _relationship
)


class Base(DeclarativeBase): ...
relationship = partial(_relationship, lazy="raise")

from .provider import Provider, LlmModel
from .agent import Agent
from .workspace import Workspace, WorkspaceNote
from .tasks import Task, TaskResource, Subtask, Schedule, RunRecord
from .toolset import Toolset, Tool
from .skill import Skill
from .markdown_cache import MarkdownCache

__all__ = [
    "Base",
    "Provider", "LlmModel",
    "Agent",
    "Workspace", "WorkspaceNote",
    "Task", "TaskResource", "Subtask", "Schedule", "RunRecord",
    "Toolset", "Tool",
    "Skill",
    "MarkdownCache",
]
