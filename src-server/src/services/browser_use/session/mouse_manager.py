from collections.abc import Callable
from dataclasses import dataclass
from functools import singledispatchmethod
from typing import Annotated, Literal

from pydantic import Discriminator
from playwright.async_api import Page

from .types import ClickButton, ClickModifiers


@dataclass
class Click:
    type: Literal["click"]
    ref: str
    double_click: bool = False
    button: ClickButton = "left"
    modifiers: list[ClickModifiers] | None = None

@dataclass
class Scroll:
    type: Literal["scroll"]
    ref: str | None = None
    delta_y: float = 0
    delta_x: float = 0

@dataclass
class Hover:
    type: Literal["hover"]
    ref: str

type MouseAction = Annotated[
    Click | Scroll | Hover,
    Discriminator("type")
]

class MouseManager:
    def __init__(self, get_current_tab: Callable[[], Page]):
        self._get_current_tab = get_current_tab

    @singledispatchmethod
    async def manage(self, action: MouseAction) -> None:
        raise TypeError(f"Unsupported action: {type(action)}")

    @manage.register
    async def _(self, action: Click) -> None:
        locator = self._get_current_tab().get_by_ref(action.ref)
        await locator.click(click_count=1 if not action.double_click else 2,
                            button=action.button,
                            modifiers=action.modifiers)

    @manage.register
    async def _(self, action: Scroll) -> None:
        tab = self._get_current_tab()
        if action.ref is not None:
            locator = tab.get_by_ref(action.ref)
            await locator.hover()
        await tab.mouse.wheel(action.delta_x, action.delta_y)

    @manage.register
    async def _(self, action: Hover) -> None:
        locator = self._get_current_tab().get_by_ref(action.ref)
        await locator.hover()
