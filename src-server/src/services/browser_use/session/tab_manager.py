from dataclasses import dataclass
from functools import singledispatchmethod
from typing import Annotated, Literal, overload

from pydantic import Discriminator
from playwright.async_api import Page

from ..browser_context import BrowserContextManager


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

class TabManager:
    def __init__(self, context_manager: BrowserContextManager):
        self._context_manager = context_manager
        self._pages: list[Page] = []
        self._current_page: Page | None = None

    def register(self, page: Page):
        if page in self._pages: return
        self._pages.append(page)
        page.on("popup", self.register)

    @overload
    async def manage(self, action: NewTab) -> Page: ...

    @overload
    async def manage(self, action: ListTabs) -> list[Page]: ...

    @overload
    async def manage(self, action: SelectTab) -> Page: ...

    @overload
    async def manage(self, action: CloseTab) -> Page | None: ...

    @singledispatchmethod
    async def manage(self, action: TabAction) -> Page | list[Page] | None:
        raise TypeError(f"Unsupported action: {type(action)}")

    @manage.register
    async def _(self, _: NewTab) -> Page:
        context = await self._context_manager.get_context()
        page = await context.new_page()

        self.register(page)
        self._current_page = page

        return page

    @manage.register
    async def _(self, _: ListTabs) -> list[Page]:
        return list(self._pages)

    @manage.register
    async def _(self, action: SelectTab) -> Page:
        self._current_page = self._pages[action.index]
        return self._current_page

    @manage.register
    async def _(self, action: CloseTab) -> Page | None:
        if action.index is None:
            if self._current_page is None:
                raise ValueError("No current page to close")
            page = self._current_page
        else:
            page = self._pages[action.index]

        closed_index = self._pages.index(page)

        await page.close()
        self._pages.remove(page)

        if not self._pages:
            self._current_page = None
        else:
            next_index = min(closed_index, len(self._pages) - 1)
            self._current_page = self._pages[next_index]

        return self._current_page

    def stop(self) -> None:
        for page in self._pages:
            page.remove_listener("popup", self.register)

        self._pages.clear()
        self._current_page = None