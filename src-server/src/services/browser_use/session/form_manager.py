from collections.abc import Callable
from dataclasses import dataclass
from functools import singledispatchmethod
from typing import Annotated, Literal

from pydantic import Discriminator
from playwright.async_api import Page


@dataclass
class SelectOption:
    type: Literal["select_option"]
    ref: str
    values: str | list[str]

@dataclass
class Check:
    type: Literal["check"]
    ref: str
    checked: bool = True

@dataclass
class Upload:
    type: Literal["upload"]
    ref: str
    files: Annotated[str | list[str], "The file path or paths to upload."]

type FormAction = Annotated[
    SelectOption | Check | Upload,
    Discriminator("type")
]

class FormManager:
    def __init__(self, get_current_tab: Callable[[], Page]):
        self._get_current_tab = get_current_tab

    @singledispatchmethod
    async def manage(self, action: FormAction) -> None:
        raise TypeError(f"Unsupported action: {type(action)}")

    @manage.register
    async def _(self, action: SelectOption) -> None:
        locator = self._get_current_tab().get_by_ref(action.ref)
        await locator.select_option(value=action.values)

    @manage.register
    async def _(self, action: Check) -> None:
        locator = self._get_current_tab().get_by_ref(action.ref)
        await locator.set_checked(action.checked)

    @manage.register
    async def _(self, action: Upload) -> None:
        locator = self._get_current_tab().get_by_ref(action.ref)
        await locator.set_input_files(action.files)
