from ..toolset_wrapper import built_in_tool, BuiltInToolset, BuiltInToolsetContext

class ExecutionControlToolset(BuiltInToolset):
    @property
    def name(self) -> str: return "ExecutionControl"

    @built_in_tool
    def ask_user(self, question: str, options: list[str] | None = None) -> str:
        """
        Ask the user for missing information.

        IMPORTANT: If you are presenting multiple choices or specific alternatives to the user, you MUST provide them in the 'options' list. Do not embed options into the question string.

        Args:
            question: The clear, concise question to ask.
            options: The options to ask the user. A list of specific choices (e.g., ["Yes", "No"]). If provided, the user will be forced to choose one.
        """
        ...

    @built_in_tool
    def finish_task(self, task_summary: str):
        """
        Once you've received the results of tool uses and can confirm that the task is complete, use this tool to present the result of your work to the user.
        Args:
            task_summary: The summary of the task. Formulate this summary in a way that is final and does not require further input from the user. Don't end your summary with questions or offers for further assistance.
        """
        ...
