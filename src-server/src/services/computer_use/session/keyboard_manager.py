import json
from dataclasses import dataclass
from functools import singledispatchmethod
from typing import Annotated, Literal

from cua_driver import ActionResult, CuaDriver, PressKeyInput, TypeTextInput
from pydantic import Discriminator

from ..types import ActionTarget, InputDeliveryMode, KeyName, Modifier, WindowTarget
from .utils import normalize_delivery_mode, normalize_modifier, unwrap_tool_result


@dataclass
class TypeText:
    type: Literal["type_text"]
    text: str
    target: ActionTarget
    delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND


@dataclass
class PressKey:
    type: Literal["press_key"]
    target: WindowTarget
    key: KeyName
    modifiers: list[Modifier] | None = None
    delivery_mode: InputDeliveryMode = InputDeliveryMode.BACKGROUND


type KeyboardAction = Annotated[TypeText | PressKey, Discriminator("type")]


class KeyboardManager:
    def __init__(self, driver: CuaDriver, session_id: str):
        self._driver = driver
        self._session_id = session_id

    @singledispatchmethod
    async def manage(self, action: KeyboardAction) -> ActionResult:
        raise TypeError(f"Unsupported action: {type(action)}")

    @manage.register
    async def _(self, action: TypeText) -> ActionResult:
        delivery_mode = normalize_delivery_mode(action.target, action.delivery_mode)
        if delivery_mode == InputDeliveryMode.BACKGROUND:
            result = await self._driver.type_text(TypeTextInput(
                session=self._session_id,
                text=action.text,
                target=action.target.to_driver(),
                scope=None,
            ))
        else:
            result = await self._driver.call_tool("type_text", json.dumps({
                "session": self._session_id,
                "text": action.text,
                "target": action.target.model_dump(),
                "delivery_mode": delivery_mode,
            }))
        return unwrap_tool_result(result)

    @manage.register
    async def _(self, action: PressKey) -> ActionResult:
        delivery_mode = normalize_delivery_mode(action.target, action.delivery_mode)
        normalized_modifiers = (
            [normalize_modifier(modifier) for modifier in action.modifiers]
            if action.modifiers is not None else None
        )
        if delivery_mode == InputDeliveryMode.BACKGROUND:
            result = await self._driver.press_key(PressKeyInput(
                session=self._session_id,
                target=action.target.to_driver(),
                key=action.key,
                modifiers=normalized_modifiers,
                scope=None,
            ))
        else:
            result = await self._driver.call_tool("press_key", json.dumps({
                "session": self._session_id,
                "target": action.target.model_dump(),
                "key": action.key,
                "modifiers": normalized_modifiers,
                "delivery_mode": delivery_mode,
            }))
        return unwrap_tool_result(result)
