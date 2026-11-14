from typing import Annotated, TypedDict, override

from src.services.browser_use.session.form_manager import FormAction
from src.services.browser_use.session.keyboard_manager import KeyboardAction
from src.services.browser_use.session.mouse_manager import MouseAction
from src.services.browser_use.session.navigator import NavigationAction
from src.services.browser_use.session.tab_manager import ListTabs, TabAction

from ..toolset_wrapper import builtin_tool, BuiltinToolDefaults, BuiltinToolset


class BrowserTab(TypedDict):
    index: int
    title: str
    url: str
    is_current: bool


class BrowserUseToolset(BuiltinToolset):
    @property
    @override
    def name(self) -> str:
        return "BrowserUse"

    @property
    @override
    def description(self) -> str | None:
        return """
Toolset for browser interactions using accessibility snapshots and element references.

Create a tab with `manage_tabs` before navigating or interacting with a page.
Use `snapshot` to inspect the current page and obtain element refs before interacting.
Refresh the snapshot after navigation or page changes rather than guessing refs.
Tab indexes are zero-based and may change after closing a tab.
All page operations target the current tab.
""".strip()

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def manage_tabs(self, action: TabAction) -> list[BrowserTab]:
        """
        Omitting index when closing closes the current tab.
        New tabs become current; navigate separately to open a URL.
        Returns all tabs with their zero-based indexes and current selection.
        """
        tabs = self._ctx.browser_use_session.tabs
        await tabs.manage(action)
        pages = await tabs.manage(ListTabs(type="list"))
        return [
            BrowserTab(
                index=index,
                title=await page.title(),
                url=page.url,
                is_current=page is tabs.current_tab,
            )
            for index, page in enumerate(pages)
        ]

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def navigate(self, action: NavigationAction) -> None:
        """
        Navigate the current tab to a URL, go back or forward, or reload.
        """
        await self._ctx.browser_use_session.navigator.manage(action)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def snapshot(self,
                       ref: Annotated[str | None,
                           "The element ref whose subtree to inspect; omit it for the whole page."] = None,
                       depth: Annotated[int | None,
                           "The maximum tree depth to include in the snapshot."] = None,
                       boxes: Annotated[bool,
                           "Whether to include element bounding boxes."] = False) -> str:
        """
        Get an accessibility snapshot of the current page with element refs.

        Use the returned refs with mouse, keyboard, and form actions.
        """
        return await self._ctx.browser_use_session.snapshot(ref=ref, depth=depth, boxes=boxes)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def mouse(self, action: MouseAction) -> None:
        """
        Perform mouse actions in the current tab.

        Use element refs obtained from snapshot.
        """
        await self._ctx.browser_use_session.mouse.manage(action)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def keyboard(self, action: KeyboardAction) -> None:
        """
        Perform keyboard actions in the current tab.

        Use fill for longer text and refs obtained from snapshot.
        """
        await self._ctx.browser_use_session.keyboard.manage(action)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def form(self, action: FormAction) -> None:
        """
        Interact with form controls in the current tab.

        Use element refs obtained from snapshot.
        """
        await self._ctx.browser_use_session.form.manage(action)
