from pydantic import BaseModel

class PaginatedResponse[Element: BaseModel](BaseModel):
    items: list[Element]
    total: int
    page: int
    per_page: int
    total_pages: int
