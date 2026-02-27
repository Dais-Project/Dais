from dataclasses import dataclass
from typing import Annotated, Literal
from ..toolset_wrapper import built_in_tool, BuiltInToolset

@dataclass
class TodoItem:
    description: str
    status: Literal["pending", "in_progress", "completed", "cancelled"]

class ExecutionControlToolset(BuiltInToolset):
    @property
    def name(self) -> str: return "ExecutionControl"

    @built_in_tool
    def finish_task(self,
                    task_summary: Annotated[str,
                        """
                        A final summary of the completed task.
                        - 1-3 sentences
                        - Clearly state what was accomplished
                        - Include notable assumptions or intentionally excluded scope, if any
                        - Must be phrased as a final statement
                        - Do NOT end with a question
                        - Do NOT offer further assistance
                        """],
                    ):
        """
        Present the final result of the task to the user.

        When to use:
        - All steps in the current task plan are complete and verified
        - The deliverable matches the user's stated goal
        - No further clarification or execution steps are required

        This tool marks the task as finished.
        """
        ...

    @built_in_tool
    def update_todos(self,
                     todos: Annotated[list[TodoItem],
                        """
                        The complete and up-to-date list of all todo items.
                        Each call to this tool replaces the previous list entirely, so always include all existing items along with any changes.
                        Each item contains:
                        - description: A concise description of the subtask.
                        - status: The current status of the subtask. Must be one of:
                            - "pending": The task has not been started yet.
                            - "in_progress": The task is currently being worked on.
                            - "completed": The task has been successfully finished.
                            - "cancelled": The task is no longer needed.
                        """]
                    ) -> str:
        """
        This tool can help you list out the current subtasks that are required to be completed for a given user request.
        The list of subtasks helps you keep track of the current task, organize complex queries and help ensure that you don't miss any steps.
        With this list, the user can also see the current progress you are making in executing a given task.

        When to use:
        - At the start of a complex task, after clarifying any ambiguities with the user, to outline all the subtasks required to complete the request
        - When the scope of the task changes (e.g. user adds or removes requirements), to update the list accordingly
        - When the status of a subtask changes, to reflect the latest progress

        IMPORTANT:
        - Once you have started executing the todo list, you MUST NOT remove any existing items. You may only update the status of existing items
        - Mark each step complete immediately when done — do not batch status updates

        Returns:
            A confirmation message that the todo list has been updated.
        """
        return "[System] Todo list updated"
