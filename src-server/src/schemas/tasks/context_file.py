from typing import Literal
from .. import DTOBase


ContextFileItemType = Literal["folder", "file"]

class ContextFileItem(DTOBase):
    path: str
    name: str
    type: ContextFileItemType
