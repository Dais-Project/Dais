from pydantic import BaseModel
from sse_starlette import ServerSentEvent

class EmptyServerSentEvent(ServerSentEvent):
    def __init__(self, event: str):
        super().__init__(event=event, data="")

class PaginatedResponse[Element: BaseModel](BaseModel):
    items: list[Element]
    total: int
    page: int
    per_page: int
    total_pages: int
