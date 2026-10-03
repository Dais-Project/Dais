from typing import Annotated, override

from cua_driver import ListAppsOutput
from dais_sdk.types import Base64Source, ContentBlock, ImageBlock, TextBlock
from pydantic import Field

from src.services.computer_use.types import (
    ClickButton, ClickPosition,
    DragCoordinates,
    KeyName, Modifier,
    ScrollDirection,
    WindowStateOptions,
    WindowTarget,
)
from src.schemas.computer_use import ActionResultModel

from ..toolset_wrapper import builtin_tool, BuiltinToolDefaults, BuiltinToolset


class ComputerUseToolset(BuiltinToolset):
    @property
    @override
    def name(self) -> str:
        return "ComputerUse"

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def list_apps(self) -> ListAppsOutput:
        """
        List apps, both currently running and installed-but-not-running.
        """
        return await self._ctx.computer_use_session.list_apps()

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def list_windows(self, pid: int | None) -> ActionResultModel:
        """
        List all windows for the specified app process, or for all apps if pid is None.
        """
        result = await self._ctx.computer_use_session.list_windows(pid)
        return ActionResultModel.model_validate(result)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def get_window_state(self,
                               pid: int,
                               window_id: int,
                               options: WindowStateOptions,
                               ) -> dict | list[ContentBlock]:
        """
        Get either the accessibility tree or a screenshot of a window.

        Prefer the accessibility tree for ordinary UI interaction because it provides structured elements that can be targeted directly.
        Use a screenshot when the target is not represented reliably in the accessibility tree, or when visual information or coordinate-based interaction is required.
        """
        result = await self._ctx.computer_use_session.get_window_state(pid, window_id, options)
        match result.type:
            case "screenshot":
                blocks = []
                blocks += [
                    ImageBlock(source=Base64Source(mime_type=image.mime_type, data=image.data_base64))
                    for image in result.images
                ]
                blocks += [
                    TextBlock(text=f"""
Screenshot width: {result.screenshot_width}
Screenshot height: {result.screenshot_height}
""".strip())
                ]
                return blocks
            case "accessibility_tree":
                return result.model_dump(exclude={"type"})

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def click(self,
                    target: WindowTarget,
                    position: ClickPosition,
                    button: ClickButton = ClickButton.LEFT,
                    ) -> ActionResultModel:
        """
        Click a position or accessibility element in the target window.

        Use an element target when available;
        use coordinates for targets identified visually from the window screenshot.
        """
        result = await self._ctx.computer_use_session.click(target, position.to_driver(), button)
        return ActionResultModel.model_validate(result)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def type_text(self,
                        text: str,
                        target: WindowTarget,
                        ) -> ActionResultModel:
        """
        Enter text and punctuation into the focused control in the target window rather than using `press_key` for text input.

        NOTE:
            Before calling this tool, the intended input widget must be focused.
        """
        result = await self._ctx.computer_use_session.type_text(text, target)
        return ActionResultModel.model_validate(result)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def scroll(self,
                     target: WindowTarget,
                     x: float,
                     y: float,
                     direction: ScrollDirection,
                     amount: Annotated[int, Field(gt=0, description="The number of lines to scroll.")] = 1,
                     ) -> ActionResultModel:
        result = await self._ctx.computer_use_session.scroll(target, x, y, direction, amount)
        return ActionResultModel.model_validate(result)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def press_key(self,
                        target: WindowTarget,
                        key: KeyName,
                        modifiers: list[Modifier] | None = None,
                        ) -> ActionResultModel:
        result = await self._ctx.computer_use_session.press_key(target, key, modifiers)
        return ActionResultModel.model_validate(result)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def drag(self,
                   target: WindowTarget,
                   start: DragCoordinates,
                   end: DragCoordinates,
                   button: ClickButton = ClickButton.LEFT,
                   modifiers: list[Modifier] | None = None,
                   ) -> ActionResultModel:
        """
        Drag from start to end in the target window.

        Both positions use window-local screenshot pixel coordinates in the same coordinate space as the window screenshot returned by `get_window_state`,
        with (0, 0) at its top-left corner, not screen-absolute coordinates.
        """
        result = await self._ctx.computer_use_session.drag(
            target,
            start,
            end,
            button,
            modifiers,
        )
        return ActionResultModel.model_validate(result)
