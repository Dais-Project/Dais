from collections.abc import AsyncGenerator
from sse_starlette import ServerSentEvent

type SseGenerator = AsyncGenerator[ServerSentEvent | None, None]
