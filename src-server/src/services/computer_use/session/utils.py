import platform
from typing import Literal

from cua_driver import ActionResult, ToolResult

from ..types import ActionTarget, InputDeliveryMode, Modifier


def unwrap_tool_result(result: ToolResult) -> ActionResult:
    if result.is_error:
        raise Exception(result.error_code, result.text)
    assert result.action is not None
    return result.action


def normalize_modifier(modifier: Modifier) -> Modifier | Literal["option", "win", "super"]:
    if modifier != "meta": return modifier
    match platform.system():
        case "Windows": return "win"
        case "Darwin": return "option"
        case "Linux": return "super"
        case system: raise RuntimeError(f"Unsupported platform: {system!r}")


def normalize_delivery_mode(target: ActionTarget, delivery_mode: InputDeliveryMode) -> InputDeliveryMode:
    if target.kind == "desktop":
        return InputDeliveryMode.FOREGROUND
    return delivery_mode
