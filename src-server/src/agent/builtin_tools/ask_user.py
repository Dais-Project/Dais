def ask_user(question: str, options: list[str] | None = None) -> str:
    """
    Ask the user for additional information that is required to make progress.
    This tool can be used in two ways:
    1. Directly ask the user with a question, and expect the user respond with a text message.
    2. Ask user with some options, and expect the user to select one of the options.

    Args:
        question: The question to ask the user.
        options: The options to ask the user. If not provided, the user can respond with a text message.
    """
    ...
