import base64


def to_base64_str(bytes: bytes) -> str:
    base64_bytes = base64.b64encode(bytes)
    return base64_bytes.decode("utf-8")
