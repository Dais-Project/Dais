import json
from dataclasses import dataclass
from functools import singledispatchmethod
from typing import Annotated, Literal

from cua_driver import ActionResult, ClickInput, CuaDriver, DragInput, ScrollBy, ScrollInput
from pydantic import Discriminator, Field

from ..types import (
    ActionTarget, ClickButton, ClickPosition, DragCoordinates,
    InputDeliveryMode, Modifier, ScrollDirection, WindowTarget,
)
from .utils import normalize_delivery_mode, normalize_modifier, unwrap_tool_result


@dataclass
class Click:
    type: Literal["click"]
    target: ActionTarget
    position: ClickPosition
    button: ClickButton = ClickButton.LEFT
    double_click: bool = False
    delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND


@dataclass
class Scroll:
    type: Literal["scroll"]
    target: WindowTarget
    x: float
    y: float
    direction: ScrollDirection
    amount: Annotated[int, Field(gt=0, description="The number of lines to scroll.")] = 1
    delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND


@dataclass
class Drag:
    type: Literal["drag"]
    target: WindowTarget
    start: DragCoordinates
    end: DragCoordinates
    button: ClickButton = ClickButton.LEFT
    modifiers: list[Modifier] | None = None
    delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND


type MouseAction = Annotated[Click | Scroll | Drag, Discriminator("type")]


class MouseManager:
    def __init__(self, driver: CuaDriver, session_id: str):
        self._driver = driver
        self._session_id = session_id

    @singledispatchmethod
    async def manage(self, action: MouseAction) -> ActionResult:
        raise TypeError(f"Unsupported action: {type(action)}")

    @manage.register
    async def _(self, action: Click) -> ActionResult:
        delivery_mode = normalize_delivery_mode(action.target, action.delivery_mode)
        return await self._driver.click(ClickInput(
            session=self._session_id,
            target=action.target.to_driver(),
            position=action.position.to_driver(),
            button=action.button.to_driver(),
            delivery_mode=delivery_mode.to_driver(),
            # Note: count=2 is pixel path only under macOS
            # until cua_driver==0.33.1
            count=2 if action.double_click else 1,
        ))

    @manage.register
    async def _(self, action: Scroll) -> ActionResult:
        delivery_mode = normalize_delivery_mode(action.target, action.delivery_mode)
        if delivery_mode == InputDeliveryMode.BACKGROUND:
            result = await self._driver.scroll(ScrollInput(
                session=self._session_id,
                x=action.x,
                y=action.y,
                direction=action.direction.to_driver(),
                target=action.target.to_driver(),
                by=ScrollBy.LINE,
                amount=action.amount,
                scope=None,
            ))
        else:
            result = await self._driver.call_tool("scroll", json.dumps({
                "session": self._session_id,
                "x": action.x,
                "y": action.y,
                "direction": action.direction,
                "target": action.target.model_dump(),
                "by": "line",
                "amount": action.amount,
                "delivery_mode": delivery_mode,
            }))
        return unwrap_tool_result(result)

    @manage.register
    async def _(self, action: Drag) -> ActionResult:
        delivery_mode = normalize_delivery_mode(action.target, action.delivery_mode)
        normalized_modifiers = (
            [normalize_modifier(modifier) for modifier in action.modifiers]
            if action.modifiers is not None else None
        )
        if delivery_mode == InputDeliveryMode.BACKGROUND:
            result = await self._driver.drag(DragInput(
                session=self._session_id,
                from_x=action.start.x,
                from_y=action.start.y,
                to_x=action.end.x,
                to_y=action.end.y,
                target=action.target.to_driver(),
                button=action.button.to_driver(),
                modifier=normalized_modifiers,
                scope=None,
                duration_ms=None,
                steps=None,
            ))
        else:
            result = await self._driver.call_tool("drag", json.dumps({
                "session": self._session_id,
                "from_x": action.start.x,
                "from_y": action.start.y,
                "to_x": action.end.x,
                "to_y": action.end.y,
                "target": action.target.model_dump(),
                "button": action.button,
                "modifier": normalized_modifiers,
                "delivery_mode": delivery_mode,
            }))
        return unwrap_tool_result(result)
