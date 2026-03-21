from typing import Annotated, override
from ..toolset_wrapper import built_in_tool, BuiltInToolDefaults, BuiltInToolset, BuiltInToolsetContext

class UserInteractionToolset(BuiltInToolset):
    @property
    @override
    def name(self) -> str: return "UserInteraction"

    @built_in_tool(validate=True, defaults=BuiltInToolDefaults(needs_user_interaction=True))
    def ask_user(self,
                 question: Annotated[str,
                    """
                    The clear and concise question to ask the user.

                    IMPORTANT:
                    If this is a multiple-choice question, DO NOT list options here (no A/B/C, no 1/2/3, no bullet points).
                    The options must be passed separately via the 'options' parameter.
                    """],
                 options: Annotated[list[str] | None,
                    """
                    Specific options for the user to choose from.
                    If provided, the user is forced to choose one option.
                    """] = None
                 ) -> str:
        """
        Ask the user for missing information.

        When SHOULD to use:
            - The following action is **irreversible** (file deletion, sending messages, making payments, system configuration changes, etc.) and the user has not explicitly confirmed intent
            - A required parameter cannot be inferred from context and has no safe default
            - A necessary tool use has failed 3 consecutive times
            - The task has two (or more) valid interpretations with meaningfully different outcomes, and assumption cost is high

        When NOT to use:
            - Simple conversation or quick factual questions
            - The user already provided clear, detailed requirements
            - Stylistic preferences when a reasonable default exists
            - The task has been already clarified earlier in the conversation

        CORRECT & INCORRECT Usage Examples:
            [WANT: Ask for clarification on format]
            INCORRECT: ask_user(question="Should the report be PDF, Word, or HTML?")
            CORRECT:   ask_user(question="What format would you like for the report?", options=["PDF", "Word", "HTML"])

            [WANT: Open-ended question]
            CORRECT:   ask_user(question="What specific time period should I search for?")
        """
        ...

    @built_in_tool(validate=True, defaults=BuiltInToolDefaults(needs_user_interaction=True))
    def show_plan(self,
                  plan: Annotated[str,
                    """
                    The complete execution plan in Markdown format. Must include: 
                    - A brief one-sentence goal summary
                    - Numbered steps with clear action descriptions
                    - Any important assumptions, constraints, or risks noted at the end
                    """],
                  alternatives: Annotated[list[str] | None,
                    """
                    Alternative approaches you considered but did not include in the current plan, along with a brief reason for each trade-off.
                    Include 2-4 options when the plan has meaningful trade-offs or ambiguities worth surfacing to the user.
                    Omit only for truly mechanical tasks with a single obvious approach.
                    """] = None
                  ) -> str:
        """
        Present a structured execution plan to the user for review before starting a complex task.
        Call this tool once you have finalized your plan — do NOT call it speculatively or mid-execution.

        The UI will render the plan and alternatives automatically.
        Do NOT repeat or summarize the plan content in your accompanying text response.

        Returns:
            Either a user approval confirmation (proceed with execution),
            or user feedback describing requested changes — which may be a direct selection from the provided alternatives, or free-form input (revise the plan accordingly before proceeding).
        """
        ...
