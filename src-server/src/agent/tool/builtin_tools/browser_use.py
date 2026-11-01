from typing import TypedDict, override

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
                       ref: str | None = None,
                       depth: int | None = None,
                       boxes: bool = False) -> str:
        """
        Get an accessibility snapshot of the current page with element refs.

        Set ref to inspect a specific element's subtree, or omit it for the whole page.
        Set depth to limit the tree depth and boxes to include element bounding boxes.
        Use the returned refs with mouse, keyboard, and form actions.
        """
        return await self._ctx.browser_use_session.snapshot(ref=ref, depth=depth, boxes=boxes)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def mouse(self, action: MouseAction) -> None:
        """
        Click, hover, or scroll in the current tab.

        Click and hover require an element ref from snapshot.
        Click supports double_click, button (left/right/middle), and modifiers.
        Scroll uses delta_x and delta_y in pixels; positive values scroll right/down.
        A scroll ref hovers that element before scrolling; omit it to use the current pointer.
        """
        await self._ctx.browser_use_session.mouse.manage(action)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def keyboard(self, action: KeyboardAction) -> None:
        """
        Fill an input or press a key/shortcut in the current tab.

        Fill requires ref and text, replaces existing input content, and optionally
        submits with Enter when submit is true.
        Press_shortcut accepts a shortcut such as Enter or ControlOrMeta+A.
        Set ref to target an element, or omit it to use the currently focused element.
        Use fill for longer text and refs obtained from snapshot.
        """
        await self._ctx.browser_use_session.keyboard.manage(action)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def form(self, action: FormAction) -> None:
        """
        Select options, set a checkbox state, or upload files in the current tab.

        All actions require an element ref from snapshot.
        Select_option accepts values as a single option value or a list of values.
        Check uses checked=true to check and checked=false to uncheck.
        Upload accepts files as a local file path or a list of local file paths.
        """
        await self._ctx.browser_use_session.form.manage(action)
