from typing import Annotated, Callable, Sequence, override

from dais_sdk.types import Base64Source, ContentBlock, ImageBlock, TextBlock
from pydantic import Field
from loguru import logger
from rapidfuzz import fuzz

from src.services.computer_use.types import (
    ActionTarget, ClickButton, ClickPosition,
    DragCoordinates, InputDeliveryMode,
    KeyName, Modifier,
    ScrollDirection,
    WindowStateOptions,
    WindowTarget,
    ActionResultModel,
)

from ..toolset_wrapper import builtin_tool, BuiltinToolDefaults, BuiltinToolset


def normalize_delivery_mode(target: ActionTarget, delivery_mode: InputDeliveryMode) -> InputDeliveryMode:
    if target.kind == "desktop":
        return InputDeliveryMode.FOREGROUND
    return delivery_mode

def fuzzy_score(query: str, *values: str | None) -> float:
    query = query.casefold()
    scores = []

    for value in values:
        if value is None: continue

        value = value.casefold()

        if query == value: score = 100
        elif query in value: score = 95
        else: score = fuzz.WRatio(query, value)

        scores.append(score)

    return max(scores, default=0)

class ComputerUseToolset(BuiltinToolset):
    @property
    @override
    def name(self) -> str:
        return "ComputerUse"

    @property
    @override
    def description(self) -> str | None:
        return """
Toolset for general GUI application interactions.

**Target and coordinate rules**:

The operation target can be a window or a desktop.

- For window targets, coordinates are window-local screenshot pixels relative to the top-left corner of the screenshot returned by `get_window_state`,
  where the (0, 0) is the screenshot's top-left corner.
- For desktop targets, coordinates are screen pixels relative to the top-left corner of the display screenshot returned by `get_desktop_state`,
  where (0, 0) is the display's top-left corner.
- Note: Desktop targets always use foreground interaction.

Input delivery rules:
- For window targets, use background mode by default.
  Switch to foreground when the target application does not reliably support background interaction.
- For desktop targets, the requested `delivery_mode` does not affect execution;
  the tool always uses foreground delivery.

Usage guidelines:
- If you remain stuck on the same operation for over 5 times of tool calls make no meaningful progress, stop attempting it rather than retrying indefinitely.
  Inform the user what you were trying to do, what is blocking progress, and that you have stopped.
""".strip()

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def list_apps(self,
                        query: Annotated[str | None, "Optional query to filter apps"] = None) -> list[str]:
        """
        List apps, both currently running and installed-but-not-running.
        """
        THRESHOLD = 60
        TOP_K = 10

        result = await self._ctx.computer_use_session.list_apps()
        if query is None or query.strip() == "":
            return [str(app) for app in result.apps]

        filtered = [(app, score) for app in result.apps
                    if (score := fuzzy_score(query, app.name, app.bundle_id, app.launch_path)) and score >= THRESHOLD]
        filtered.sort(key=lambda x: x[1], reverse=True)
        return [str(app) for app, _ in filtered[:TOP_K]]

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def list_windows(self,
                           pid: int | None,
                           query: Annotated[str | None, "Optional query to filter windows"] = None
                           ) -> list[str]:
        """
        List all windows for the specified app process, or for all apps if pid is None.
        """
        THRESHOLD = 60
        TOP_K = 6

        result = await self._ctx.computer_use_session.list_windows(pid)
        if query is None or query.strip() == "":
            return [str(window) for window in result.windows]
        
        filtered = [(window, score) for window in result.windows
                    if (score := fuzzy_score(query, window.app_name, window.title)) and score >= THRESHOLD]
        filtered.sort(key=lambda x: x[1], reverse=True)
        return [str(window) for window, _ in filtered[:TOP_K]]

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def get_desktop_state(self) -> list[ContentBlock]:
        """
        Get the screenshot for the primary display.
        """
        result = await self._ctx.computer_use_session.get_desktop_state()
        blocks = []
        blocks.extend(
            ImageBlock(source=Base64Source(mime_type=image.mime_type, data=image.data_base64))
            for image in result.images
        )
        blocks.append(TextBlock(text=f"""
Screen width: {result.screen_width}
Screen height: {result.screen_height}
Scale factor: {result.scale_factor}
""".strip()))
        return blocks

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
                blocks.extend(
                    ImageBlock(source=Base64Source(mime_type=image.mime_type, data=image.data_base64))
                    for image in result.images
                )
                blocks.append(TextBlock(text=f"""
Screenshot width: {result.screenshot_width}
Screenshot height: {result.screenshot_height}
Window width: {result.window_bounds.width}
Window height: {result.window_bounds.height}
""".strip()))
                return blocks
            case "accessibility_tree":
                return result.model_dump(exclude={"type"})

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def click(self,
                    target: ActionTarget,
                    position: ClickPosition,
                    button: ClickButton = ClickButton.LEFT,
                    double_click: bool = False,
                    delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND,
                    ) -> ActionResultModel:
        """
        Click a position or accessibility element in the target.

        Use an element target when available;
        use coordinates for targets identified visually from the window screenshot.
        """
        delivery_mode = normalize_delivery_mode(target, delivery_mode)
        result = await self._ctx.computer_use_session.click(target, position, button, double_click, delivery_mode)
        return ActionResultModel.model_validate(result)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def type_text(self,
                        text: str,
                        target: ActionTarget,
                        delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND,
                        ) -> ActionResultModel:
        """
        Enter text and punctuation into the focused control.

        NOTE:
            Before calling this tool, the intended input widget must be focused.
        """
        delivery_mode = normalize_delivery_mode(target, delivery_mode)
        result = await self._ctx.computer_use_session.type_text(text, target, delivery_mode)
        return ActionResultModel.model_validate(result)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def scroll(self,
                     target: WindowTarget,
                     x: float,
                     y: float,
                     direction: ScrollDirection,
                     amount: Annotated[int, Field(gt=0, description="The number of lines to scroll.")] = 1,
                     delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND,
                     ) -> ActionResultModel:
        delivery_mode = normalize_delivery_mode(target, delivery_mode)
        result = await self._ctx.computer_use_session.scroll(target, x, y, direction, amount, delivery_mode)
        return ActionResultModel.model_validate(result)

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def press_key(self,
                        target: WindowTarget,
                        key: KeyName,
                        modifiers: list[Modifier] | None = None,
                        delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND,
                        ) -> ActionResultModel:
        delivery_mode = normalize_delivery_mode(target, delivery_mode)
        result = await self._ctx.computer_use_session.press_key(target, key, modifiers, delivery_mode)
        validated = ActionResultModel.model_validate(result)
        logger.debug(validated)
        return validated

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=True))
    async def drag(self,
                   target: WindowTarget,
                   start: DragCoordinates,
                   end: DragCoordinates,
                   button: ClickButton = ClickButton.LEFT,
                   modifiers: list[Modifier] | None = None,
                   delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND,
                   ) -> ActionResultModel:
        """
        Drag from start to end in the target window.

        Both positions use window-local screenshot pixel coordinates in the same coordinate space as the window screenshot returned by `get_window_state`,
        with (0, 0) at its top-left corner, not screen-absolute coordinates.
        """
        delivery_mode = normalize_delivery_mode(target, delivery_mode)
        result = await self._ctx.computer_use_session.drag(
            target,
            start,
            end,
            button,
            modifiers,
            delivery_mode)
        return ActionResultModel.model_validate(result)
