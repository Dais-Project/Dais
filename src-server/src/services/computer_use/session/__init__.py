import asyncio
import json
import uuid

from cua_driver import (
    CuaDriver, EndSessionInput, GetDesktopStateInput,
    ListAppsInput, ListAppsOutput, ListWindowsInput, ListWindowsOutput,
)

from src.platforms.window_manager import restore_without_activate

from ..types import (
    AccessibilityTreeResult, DesktopStateResult, ScreenshotResult,
    WindowStateOptions, WindowStateResult,
)
from .keyboard_manager import KeyboardManager
from .mouse_manager import MouseManager


class ComputerUseSession:
    def __init__(self, driver: CuaDriver):
        self._session_id = str(uuid.uuid4())
        self._driver = driver
        self._loop = asyncio.get_running_loop()
        self._mouse_manager = MouseManager(driver, self.id)
        self._keyboard_manager = KeyboardManager(driver, self.id)

    def __del__(self):
        """
        Fallback and best-effort cleanup invocation.
        """
        if self._loop.is_closed(): return
        self._loop.call_soon_threadsafe(
            lambda: asyncio.create_task(self.stop()))

    @property
    def id(self) -> str:
        return self._session_id

    @property
    def mouse(self) -> MouseManager:
        return self._mouse_manager

    @property
    def keyboard(self) -> KeyboardManager:
        return self._keyboard_manager

    async def list_apps(self) -> ListAppsOutput:
        return await self._driver.list_apps(ListAppsInput())

    async def list_windows(self, pid: int | None) -> ListWindowsOutput:
        return await self._driver.list_windows(
            ListWindowsInput(pid=pid, on_screen_only=False))

    async def get_desktop_state(self):
        result = await self._driver.get_desktop_state(GetDesktopStateInput(
            session=self.id,
            max_image_dimension=None,
            screenshot_out_file=None,
        ))
        if result.is_error:
            raise Exception(result.error_code, result.text)
        assert result.structured_json is not None
        structured = json.loads(result.structured_json)
        return DesktopStateResult(
            images=result.images,
            screen_width=structured["screen_width"],
            screen_height=structured["screen_height"],
            scale_factor=structured["scale_factor"])

    async def get_window_state(self,
                               pid: int,
                               window_id: int,
                               options: WindowStateOptions,
                               ) -> WindowStateResult:
        restore_without_activate(window_id)
        result = await self._driver.get_window_state(
            options.to_driver_options(session=self.id, pid=pid, window_id=window_id))
        match options.kind:
            case "screenshot":
                return ScreenshotResult.from_driver(result)
            case "accessibility_tree":
                return AccessibilityTreeResult.from_driver(result)

    async def stop(self):
        await self._driver.end_session(EndSessionInput(session=self.id))
