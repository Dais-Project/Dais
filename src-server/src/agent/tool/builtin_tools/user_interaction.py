from ..toolset_wrapper import built_in_tool, BuiltInToolset, BuiltInToolsetContext

class UserInteractionToolset(BuiltInToolset):
    @property
    def name(self) -> str: return "UserInteraction"

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
    def show_plan(self, plan: str) -> str:
        """
        Use this tool to present a structured execution plan to the user before starting a complex task.
        You should call this tool after you have done your plan for some task.
        The tool will render the plan in the UI automatically. You do not need to repeat the plan content in your text response.

        Args:
            plan: The complete execution plan in markdown format. Should include a brief goal summary, numbered steps, and any important notes or assumptions.

        Returns:
            A confirmation message that the plan has been shown to the user.
        """
        return "[System] Plan has been shown to user."
