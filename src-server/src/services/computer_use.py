import uuid
from cua_driver import (
    CuaDriver,
    StartSessionInput, EndSessionInput,
    ListAppsInput, ListAppsOutput,
    ListWindowsInput, ListWindowsOutput,
    GetWindowStateInput, WindowStateOutput,
    ClickInput, ClickPosition, ClickButton,
    TypeTextInput,
    ScrollInput, ScrollDirection, ScrollBy,
    PressKeyInput,
    DragInput,
    ActionTarget, ActionResult, InputDeliveryMode,
)


class ComputerUseSession:
    def __init__(self, driver: CuaDriver):
        self._session_id = str(uuid.uuid4())
        self._driver = driver

    @property
    def id(self) -> str:
        return self._session_id

    async def list_apps(self) -> ListAppsOutput:
        return await self._driver.list_apps(ListAppsInput())

    async def list_windows(self, pid: bool) -> ListWindowsOutput:
        return await self._driver.list_windows(
            ListWindowsInput(pid=pid, on_screen_only=False))

    async def get_window_state(self,
                               pid: int,
                               window_id: int,
                               include_screenshot: bool = False,
                               include_accessibility_tree: bool = False,
                               query: str | None = None,
                               max_depth: int | None = None,
                               max_elements: int | None = None,
                               ) -> WindowStateOutput:
        return await self._driver.get_window_state(
            GetWindowStateInput(
                session=self.id,
                pid=pid,
                window_id=window_id,
                include_screenshot=False,
                include_accessibility_tree=False,
                query=query,
                max_depth=max_depth,
                max_elements=max_elements,
                screenshot_out_file=None,
                max_dimension=None,
                max_image_dimension=None,
                timeout_ms=None,
            ))

    async def click(self,
                    target: ActionTarget,
                    position: ClickPosition,
                    button: ClickButton = ClickButton.LEFT) -> ActionResult:
        return await self._driver.click(ClickInput(
            session=self.id,
            target=target,
            position=position,
            button=button,
            delivery_mode=InputDeliveryMode.BACKGROUND,
            count=1,
        ))
    
    async def type_text(self, text: str, target: ActionTarget):
        await self._driver.type_text(TypeTextInput(
            session=self.id,
            text=text,
            target=target,
            scope=None,
        ))

    async def scroll(self,
                     target: ActionTarget,
                     x:float,
                     y:float,
                     direction:ScrollDirection,
                     amount:int = 1):
        await self._driver.scroll(ScrollInput(
            session=self.id,
            x=x,
            y=y,
            direction=direction,
            target=target,
            by=ScrollBy.LINE,
            amount=amount,
            scope=None,
        ))

    async def press_key(self,
                        target: ActionTarget,
                        key: str,
                        modifiers: list[str] = []):
        await self._driver.press_key(PressKeyInput(
            session=self.id,
            target=target,
            key=key,
            modifiers=modifiers,
            scope=None,
        ))

    async def drag(self,
                   target: ActionTarget,
                   start: ClickPosition.COORDINATES,
                   end: ClickPosition.COORDINATES,
                   button: ClickButton = ClickButton.LEFT,
                   modifiers: list[str] = []):
        await self._driver.drag(DragInput(
            session=self.id,
            from_x=start.x,
            from_y=start.y,
            to_x=end.x,
            to_y=end.y,
            target=target,
            button=button,
            modifier=modifiers,
            scope=None,
            duration_ms=None,
            steps=None,
        ))

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

__instance = ComputerUse()

def use_computer():
    return __instance
