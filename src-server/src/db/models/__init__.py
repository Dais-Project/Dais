from functools import partial
from sqlalchemy.orm import (
    DeclarativeBase,
    relationship as _relationship
)


class Base(DeclarativeBase): ...
relationship = partial(_relationship, lazy="raise")

from .provider import Provider, LlmModel
from .agent import Agent
from .workspace import Workspace
from .task import Task, TaskResource
from .toolset import Toolset, Tool
from .skill import Skill
from .markdown_cache import MarkdownCache

__all__ = [
    "Base",
    "Provider", "LlmModel",
    "Agent",
    "Workspace",
    "Task", "TaskResource",
    "Toolset", "Tool",
    "Skill",
    "MarkdownCache",
]
