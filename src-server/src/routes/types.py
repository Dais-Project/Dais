from typing import TypeVar, Generic
from pydantic import BaseModel

Element = TypeVar("Element", bound=BaseModel)
class PaginatedResponse(BaseModel, Generic[Element]):
    items: list[Element]
    total: int
    page: int
    per_page: int
    total_pages: int
