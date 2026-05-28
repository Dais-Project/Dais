from typing import Literal

from . import DTOBase


class DirectoryItem(DTOBase):
    path: str
    name: str
    type: Literal["folder"] = "folder"


class ListDirectoriesResult(DTOBase):
    items: list[DirectoryItem]
