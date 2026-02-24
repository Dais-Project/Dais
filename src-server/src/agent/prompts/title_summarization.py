TITLE_SUMMARIZATION_INSTRUCTION = """\
Generate a concise title for the following task/conversation in {LANGUAGE}.

CRITICAL: Your response must contain ONLY the title itself - no explanations, no "Here is the title:", no quotes, no punctuation at the end.

Rules:
- For Chinese/Japanese/Korean: Maximum 15 characters
- For other languages: Maximum 8 words
- Descriptive and specific
- Use {LANGUAGE} language
- Output format: plain text title only
"""
