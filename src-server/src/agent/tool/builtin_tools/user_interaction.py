from typing import Annotated
from ..toolset_wrapper import built_in_tool, BuiltInToolset, BuiltInToolsetContext

class UserInteractionToolset(BuiltInToolset):
    @property
    def name(self) -> str: return "UserInteraction"

    @built_in_tool(validate=True)
    def ask_user(self,
                 question: Annotated[str,
                    "The clear and concise question to ask the user. "],
                 options: Annotated[list[str] | None,
                    "(Default: None) Specific options for the user to choose from. " \
                    "If provided, the user is forced to choose one option."] = None
                 ) -> str:
        """
        Ask the user for missing information.

        IMPORTANT:
        - If you are presenting multiple choices or specific alternatives to the user, you MUST provide them in the 'options' list. Do not embed options into the question string

        Examples of underspecified requests - always use the tool:
        - "Create a presentation about X" → Ask about audience, length, tone, key points  
        - "Put together some research on Y" → Ask about depth, format, specific angles, intended use  
        - "Find interesting messages in Slack" → Ask about time period, channels, topics, what "interesting" means  
        - "Summarize what's happening with Z" → Ask about scope, depth, audience, format  
        - "Help me prepare for my meeting" → Ask about meeting type, what preparation means, deliverables  

        When SHOULD to use:
        - The following action is **irreversible** (file deletion, sending messages, making payments, system configuration changes, etc.) and the user has not explicitly confirmed intent
        - A required parameter cannot be inferred from context and has no safe default
        - A nessesary tool use has failed 3 consecutive times
        - The task has two (or more) valid interpretations with meaningfully different outcomes, and assumption cost is high

        When NOT to use:
        - Simple conversation or quick factual questions
        - The user already provided clear, detailed requirements
        - Stylistic preferences when a reasonable default exists
        - The task has been already clarified earlier in the conversation
        """
        ...

    @built_in_tool(validate=True)
    def show_plan(self,
                  plan: Annotated[str,
                    "The complete execution plan in markdown format. Should include a brief goal summary, numbered steps, and any important notes or assumptions."]
                  ) -> str:
        """
        Use this tool to present a structured execution plan to the user before starting a complex task.
        You should call this tool after you have done your plan for some task.
        The tool will render the plan in the UI automatically. You do not need to repeat the plan content in your text response.

        Returns:
            A confirmation message that the plan has been shown to the user.
        """
        return "[System] Plan has been shown to user."
