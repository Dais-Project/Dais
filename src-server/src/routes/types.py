from typing import TypeVar, TypedDict, Generic, Any
from flask import Response

Res = TypeVar("Res")
FlaskResponse = Response | tuple[Res, int] | tuple[Res, int, dict[str, Any]] | Res

Element = TypeVar("Element")
class PaginatedResponse(TypedDict, Generic[Element]):
    items: list[Element]
    total: int
    page: int
    per_page: int
    total_pages: int
