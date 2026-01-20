from typing import TypeVar, Generic, Any
from flask import Response
from pydantic import BaseModel, ConfigDict

Res = TypeVar("Res")
FlaskResponse = Response | tuple[Res, int] | tuple[Res, int, dict[str, Any]] | Res

Element = TypeVar("Element", bound=BaseModel)
class PaginatedResponse(BaseModel, Generic[Element]):
    items: list[Element]
    total: int
    page: int
    per_page: int
    total_pages: int
