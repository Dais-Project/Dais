from dataclasses import dataclass
from typing import Literal
from ..toolset_wrapper import built_in_tool, BuiltInToolset

@dataclass
class TodoItem:
    description: str
    status: Literal["pending", "in_progress", "completed", "cancelled"]

class ExecutionControlToolset(BuiltInToolset):
    @property
    def name(self) -> str: return "ExecutionControl"

    @built_in_tool
    def finish_task(self, task_summary: str):
        """
        Once you've received the results of tool uses and can confirm that the task is complete, use this tool to present the result of your work to the user.
        Args:
            task_summary: The summary of the task. Formulate this summary in a way that is final and does not require further input from the user. Don't end your summary with questions or offers for further assistance.
        """
        ...

    @built_in_tool
    def update_todos(self, todos: list[TodoItem]) -> str:
        """
        This tool can help you list out the current subtasks that are required to be completed for a given user request.
        The list of subtasks helps you keep track of the current task, organize complex queries and help ensure that you don't miss any steps.
        With this list, the user can also see the current progress you are making in executing a given task.

        Args:
            todos: The complete and up-to-date list of all todo items. Each call to this tool replaces the previous list entirely, so always include all existing items along with any changes.
                   Each item contains:
                - description: A concise description of the subtask.
                - status: The current status of the subtask. Must be one of:
                    - "pending": The task has not been started yet.
                    - "in_progress": The task is currently being worked on.
                    - "completed": The task has been successfully finished.
                    - "cancelled": The task is no longer needed.
        """
        return "[System] Todo list updated"
