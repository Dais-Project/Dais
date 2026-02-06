def ask_user(question: str, options: list[str] | None = None) -> str:
    """
    Ask the user for missing information.

    IMPORTANT: If you are presenting multiple choices or specific alternatives to the user, you MUST provide them in the 'options' list. Do not embed options into the question string.

    Args:
        question: The clear, concise question to ask.
        options: The options to ask the user. A list of specific choices (e.g., ["Yes", "No"]). If provided, the user will be forced to choose one.
    """
    ...
