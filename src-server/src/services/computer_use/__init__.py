from cua_driver import CuaDriver, EndSessionInput, StartSessionInput

from src.platforms.window_manager import configure_dpi_awareness

from .session import ComputerUseSession

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
