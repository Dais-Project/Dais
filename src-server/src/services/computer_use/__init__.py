import asyncio
import json
import platform
import uuid
from typing import Literal

from cua_driver import (
    CuaDriver,
    GetDesktopStateInput,
    StartSessionInput, EndSessionInput,
    ListAppsInput, ListAppsOutput,
    ListWindowsInput, ListWindowsOutput,
    ClickInput,
    TypeTextInput,
    ScrollInput, ScrollBy,
    PressKeyInput,
    DragInput,
    ToolResult, ActionResult,
)

from src.platforms.window_manager import configure_dpi_awareness, restore_without_activate

from .types import (
    DesktopStateResult, WindowStateOptions, ScreenshotResult, AccessibilityTreeResult, WindowStateResult,
    ClickButton, ClickPosition,
    KeyName, Modifier,
    DragCoordinates,
    ActionTarget,
    InputDeliveryMode,
    ScrollDirection,
)


def _unwrap_tool_result(result: ToolResult) -> ActionResult:
    if result.is_error:
        raise Exception(result.error_code, result.text)
    assert result.action is not None
    return result.action

def _normalize_modifier(modifier: Modifier) -> Modifier | Literal["option", "win", "super"]:
    if modifier != "meta": return modifier
    match platform.system():
        case "Windows": return "win"
        case "Darwin": return "option"
        case "Linux": return "super"
        case system: raise RuntimeError(f"Unsupported platform: {system!r}")

class ComputerUseSession:
    def __init__(self, driver: CuaDriver):
        self._session_id = str(uuid.uuid4())
        self._driver = driver
        self._loop = asyncio.get_running_loop()

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

    async def click(self,
                    target: ActionTarget,
                    position: ClickPosition,
                    button: ClickButton = ClickButton.LEFT,
                    delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND) -> ActionResult:
        return await self._driver.click(ClickInput(
            session=self.id,
            target=target.to_driver(),
            position=position.to_driver(),
            button=button.to_driver(),
            delivery_mode=delivery_mode.to_driver(),
            count=1,
        ))

    async def type_text(self,
                        text: str,
                        target: ActionTarget,
                        delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND
                        ) -> ActionResult:
        if delivery_mode == InputDeliveryMode.BACKGROUND:
            result = await self._driver.type_text(TypeTextInput(
                session=self.id,
                text=text,
                target=target.to_driver(),
                scope=None,
            ))
        else:
            result = await self._driver.call_tool("type_text", json.dumps({
                "session": self.id,
                "text": text,
                "target": target.model_dump(),
                "delivery_mode": delivery_mode,
            }))
        return _unwrap_tool_result(result)

    async def scroll(self,
                     target: ActionTarget,
                     x: float,
                     y: float,
                     direction: ScrollDirection,
                     amount: int = 1,
                     delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND) -> ActionResult:
        if delivery_mode == InputDeliveryMode.BACKGROUND:
            result = await self._driver.scroll(ScrollInput(
                session=self.id,
                x=x,
                y=y,
                direction=direction.to_driver(),
                target=target.to_driver(),
                by=ScrollBy.LINE,
                amount=amount,
                scope=None,
            ))
        else:
            result = await self._driver.call_tool("scroll", json.dumps({
                "session": self.id,
                "x": x,
                "y": y,
                "direction": direction,
                "target": target.model_dump(),
                "by": "line",
                "amount": amount,
                "delivery_mode": delivery_mode,
            }))
        return _unwrap_tool_result(result)

    async def press_key(self,
                        target: ActionTarget,
                        key: KeyName,
                        modifiers: list[Modifier] | None = None,
                        delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND) -> ActionResult:
        if modifiers is not None:
            normalized_modifiers = [_normalize_modifier(modifier) for modifier in modifiers]
        else: 
            normalized_modifiers = None

        if delivery_mode == InputDeliveryMode.BACKGROUND:
            result = await self._driver.press_key(PressKeyInput(
                session=self.id,
                target=target.to_driver(),
                key=key,
                modifiers=normalized_modifiers,
                scope=None,
            ))
        else:
            result = await self._driver.call_tool("press_key", json.dumps({
                "session": self.id,
                "target": target.model_dump(),
                "key": key,
                "modifiers": normalized_modifiers,
                "delivery_mode": delivery_mode,
            }))
        return _unwrap_tool_result(result)

    async def drag(self,
                   target: ActionTarget,
                   start: DragCoordinates,
                   end: DragCoordinates,
                   button: ClickButton = ClickButton.LEFT,
                   modifiers: list[Modifier] | None = None,
                   delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND) -> ActionResult:
        if modifiers is not None:
            normalized_modifiers = [_normalize_modifier(modifier) for modifier in modifiers]
        else: 
            normalized_modifiers = None

        if delivery_mode == InputDeliveryMode.BACKGROUND:
            result = await self._driver.drag(DragInput(
                session=self.id,
                from_x=start.x,
                from_y=start.y,
                to_x=end.x,
                to_y=end.y,
                target=target.to_driver(),
                button=button.to_driver(),
                modifier=normalized_modifiers,
                scope=None,
                duration_ms=None,
                steps=None,
            ))
        else:
            result = await self._driver.call_tool("drag", json.dumps({
                "session": self.id,
                "from_x": start.x,
                "from_y": start.y,
                "to_x": end.x,
                "to_y": end.y,
                "target": target.model_dump(),
                "button": button,
                "modifier": normalized_modifiers,
                "delivery_mode": delivery_mode,
            }))
        return _unwrap_tool_result(result)

    async def stop(self):
        await self._driver.end_session(EndSessionInput(session=self.id))

class ComputerUse:
    def __init__(self):
        self._driver = CuaDriver.create(None)

    async def create_session(self) -> ComputerUseSession:
        session = ComputerUseSession(self._driver)
        await self._driver.start_session(StartSessionInput(
            session=session.id,
            capture_scope=None,
            cursor_theme=None,
        ))
        return session

    async def stop_session(self, session: ComputerUseSession):
        await self._driver.end_session(EndSessionInput(session=session.id))

    async def shutdown(self):
        await self._driver.shutdown()

# Required by CUA screenshot capture on Windows to avoid DPI virtualization
# causing screenshots to be cropped to the top-left region.
configure_dpi_awareness()

__instance = ComputerUse()

def use_computer():
    return __instance
