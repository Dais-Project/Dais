from sse_starlette import ServerSentEvent


class EmptyServerSentEvent(ServerSentEvent):
    def __init__(self, event: str):
        super().__init__(event=event, data="")
