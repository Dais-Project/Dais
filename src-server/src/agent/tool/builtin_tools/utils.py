def truncate_output(text: str, max_chars: int = 2000) -> str:
    """
    Truncate the output text to the specified maximum number of characters.
    If the text is longer than the maximum number of characters, it will be truncated and the middle part will be replaced with a truncation note.
    """
    TRUNCATION_NOTE = "\n\n... [ Truncated {omitted_count} characters. ] ...\n\n"

    if not text or len(text) <= max_chars:
        return text

    keep_len = (max_chars - len(TRUNCATION_NOTE)) // 2
    header = text[:keep_len]
    footer = text[-keep_len:]
    omitted_count = len(text) - (len(header) + len(footer))
    return header + TRUNCATION_NOTE.format(omitted_count=omitted_count) + footer
