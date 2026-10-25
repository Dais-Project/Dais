from collections.abc import Callable
from dataclasses import dataclass
from functools import singledispatchmethod
from typing import Annotated, Literal

from pydantic import Discriminator
from playwright.async_api import Page


@dataclass
class Fill:
    type: Literal["fill"]
    ref: str
    text: str
    submit: bool = False

@dataclass
class PressShortcut:
    """
    Key or keyboard shortcut to press. Supported key names include Enter, Tab, Escape, Backspace, Delete, Insert, Space, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, End, PageUp, PageDown, F1–F12, KeyA–KeyZ, Digit0–Digit9, Backquote, Minus, Equal, Backslash, BracketLeft, BracketRight, Semicolon, Quote, Comma, Period, Slash. A single character such as a, A, 1, or # is also accepted (case-sensitive). Combine modifiers Shift, Control, Alt, Meta, or ControlOrMeta using +, e.g. ControlOrMeta+A, Control+Shift+T, Shift+Tab, Alt+ArrowLeft. ControlOrMeta maps to Control on Windows/Linux and Meta on macOS. Use a text input tool for longer text.
    """
    type: Literal["press_shortcut"]
    shortcut: str
    ref: str | None = None

type KeyboardAction = Annotated[
    Fill | PressShortcut,
    Discriminator("type")
]

class KeyboardManager:
    def __init__(self, get_current_tab: Callable[[], Page]):
        self._get_current_tab = get_current_tab

    @singledispatchmethod
    async def manage(self, action: KeyboardAction) -> None:
        raise TypeError(f"Unsupported action: {type(action)}")

    @manage.register
    async def _(self, action: Fill) -> None:
        locator = self._get_current_tab().get_by_ref(action.ref)
        await locator.fill(value=action.text)
        if action.submit:
            await locator.press("Enter")

    @manage.register
    async def _(self, action: PressShortcut) -> None:
        tab = self._get_current_tab()
        if action.ref is not None:
            locator = tab.get_by_ref(action.ref)
            await locator.press(action.shortcut)
        else:
            await tab.keyboard.press(action.shortcut)
