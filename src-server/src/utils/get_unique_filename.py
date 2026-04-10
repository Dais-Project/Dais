import os
import uuid


def get_unique_filename(original_name: str) -> str:
    ext = os.path.splitext(original_name)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return unique_name
