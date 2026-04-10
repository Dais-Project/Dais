from dais_sdk.types import ContentBlockType


def normalize_content_type(content_type: str) -> ContentBlockType:
    content_type = content_type.lower()

    if content_type.startswith("image/"): return "image"
    if content_type.startswith("audio/"): return "audio"
    if content_type.startswith("video/"): return "video"
    if content_type.startswith("text/"): return "text"

    document_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument", # Word, Excel, PPT
        "application/epub+zip"
    ]
    if any(doc_type in content_type for doc_type in document_types):
        return "document"
    return "text"
