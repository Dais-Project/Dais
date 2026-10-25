from collections.abc import Callable
from dataclasses import dataclass
from functools import singledispatchmethod
from typing import Annotated, Literal

from pydantic import Discriminator
from playwright.async_api import Page


@dataclass
class Navigate:
    type: Literal["navigate"]
    url: str

@dataclass
class GoForward:
    type: Literal["forward"]

@dataclass
class GoBack:
    type: Literal["back"]

@dataclass
class Reload:
    type: Literal["reload"]

type NavigationAction = Annotated[
    Navigate | GoForward | GoBack | Reload,
    Discriminator("type")
]

class Navigator:
    def __init__(self, get_current_tab: Callable[[], Page]):
        self._get_current_tab = get_current_tab

    @singledispatchmethod
    async def manage(self, action: NavigationAction) -> None:
        raise TypeError(f"Unsupported action: {type(action)}")

    @manage.register
    async def _(self, action: Navigate) -> None:
        await self._get_current_tab().goto(action.url)

    @manage.register
    async def _(self, _: GoForward) -> None:
        await self._get_current_tab().go_forward()

    @manage.register
    async def _(self, _: GoBack) -> None:
        await self._get_current_tab().go_back()

    @manage.register
    async def _(self, _: Reload) -> None:
        await self._get_current_tab().reload()
