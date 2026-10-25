from dataclasses import dataclass
from typing import Annotated, Literal
from pydantic import Discriminator


@dataclass
class NewTab:
    type: Literal["new"]

@dataclass
class ListTabs:
    type: Literal["list"]

@dataclass
class SelectTab:
    type: Literal["select"]
    index: int

@dataclass
class CloseTab:
    type: Literal["close"]
    index: int | None = None

type TabAction = Annotated[
    NewTab | ListTabs | SelectTab | CloseTab,
    Discriminator("type")
]
