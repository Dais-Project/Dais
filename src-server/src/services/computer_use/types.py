from enum import StrEnum
from typing import Annotated, Literal, Self, cast

from cua_driver import (
    ActionEffect, ActionRoute, ActionDelivery, ActionEvidence, ActionEscalation,
    ActionTarget as DriverActionTarget,
    ClickButton as DriverClickButton,
    ClickPosition as DriverClickPosition, ImageContent,
    InputDeliveryMode as DriverInputDeliveryMode,
    ScrollDirection as DriverScrollDirection,
    SnapshotImage,
    GetWindowStateInput,
    WindowBounds,
    WindowElement,
    WindowStateOutput,
)
from pydantic import BaseModel, ConfigDict, Field, PlainSerializer


type Serialized[T] = Annotated[T, PlainSerializer(str, return_type=str)]

# --- --- --- --- --- ---

class ActionErrorModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    hint: str | None

class ActionResultModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    effect: Serialized[ActionEffect]
    route: Serialized[ActionRoute]
    delivery: Serialized[ActionDelivery] | None
    evidence: list[Serialized[ActionEvidence]] | None
    escalation: Serialized[ActionEscalation] | None
    error: ActionErrorModel | None
    summary: str | None

# --- --- --- --- --- ---

class DesktopStateResult(BaseModel):
    images: list[Serialized[ImageContent]]
    screen_width: int
    screen_height: int
    scale_factor: float

# --- --- --- --- --- ---

class ScreenshotOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["screenshot"]
    max_image_dimension: Annotated[int | None,
                                   Field(gt=0, description="Maximum width or height of the returned screenshot in pixels")] = None

    def to_driver_options(self, session: str, pid: int, window_id: int) -> GetWindowStateInput:
        return GetWindowStateInput(
            session=session,
            pid=pid,
            window_id=window_id,
            include_screenshot=True,
            include_accessibility_tree=False,
            query=None,
            max_depth=None,
            max_elements=None,
            screenshot_out_file=None,
            max_dimension=None,
            max_image_dimension=self.max_image_dimension,
            timeout_ms=None,
        )


class AccessibilityTreeOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["accessibility_tree"]
    query: Annotated[str | None, Field(description="Filter the accessibility tree with a query.")] = None
    max_depth: Annotated[int | None, Field(gt=0)] = None
    max_elements: Annotated[int | None, Field(gt=0)] = None

    def to_driver_options(self, session: str, pid: int, window_id: int) -> GetWindowStateInput:
        return GetWindowStateInput(
            session=session,
            pid=pid,
            window_id=window_id,
            include_screenshot=False,
            include_accessibility_tree=True,
            query=self.query,
            max_depth=self.max_depth,
            max_elements=self.max_elements,
            screenshot_out_file=None,
            max_dimension=None,
            max_image_dimension=None,
            timeout_ms=None,
        )


type WindowStateOptions = Annotated[
    ScreenshotOptions | AccessibilityTreeOptions,
    Field(discriminator="kind"),
]

class WindowStateResultBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    app_name: str
    window_title: str

class ScreenshotResult(WindowStateResultBase):
    type: Literal["screenshot"] = "screenshot"
    images: list[Serialized[SnapshotImage]]
    window_bounds: Serialized[WindowBounds]
    screenshot_width: int | None
    screenshot_height: int | None
    screenshot_scale: float | None

    @classmethod
    def from_driver(cls, result: WindowStateOutput) -> Self:
        return cls.model_validate(result)

class AccessibilityTreeResult(WindowStateResultBase):
    type: Literal["accessibility_tree"] = "accessibility_tree"
    elements: list[Serialized[WindowElement]]
    total_element_count: int
    returned_element_count: int
    elements_complete: bool

    @classmethod
    def from_driver(cls, result: WindowStateOutput) -> Self:
        return cls.model_validate(result)

type WindowStateResult = Annotated[
    ScreenshotResult | AccessibilityTreeResult,
    Field(discriminator="type"),
]

# --- --- --- --- --- ---

class WindowTarget(BaseModel):
    kind: Literal["window"]
    pid: int
    window_id: int

    def to_driver(self) -> DriverActionTarget:
        return cast(DriverActionTarget, DriverActionTarget.WINDOW(self.pid, self.window_id))

class DesktopTarget(BaseModel):
    kind: Literal["desktop"]
    display_id: Literal["primary"] = "primary"

    def to_driver(self) -> DriverActionTarget:
        return cast(DriverActionTarget, DriverActionTarget.DESKTOP(self.display_id))

type ActionTarget = Annotated[WindowTarget | DesktopTarget, Field(discriminator="kind")]

# --- --- --- --- --- ---

class Coordinates(BaseModel):
    kind: Literal["coordinates"]
    x: float
    y: float

    def to_driver(self) -> DriverClickPosition:
        return cast(DriverClickPosition, DriverClickPosition.COORDINATES(self.x, self.y))

class ElementPosition(BaseModel):
    kind: Literal["element"]
    element_token: str

    def to_driver(self) -> DriverClickPosition:
        return cast(DriverClickPosition, DriverClickPosition.ELEMENT(self.element_token))

class CapturedCoordinates(BaseModel):
    kind: Literal["captured_coordinates"]
    x: float
    y: float
    capture_id: str

    def to_driver(self) -> DriverClickPosition:
        return cast(DriverClickPosition, DriverClickPosition.CAPTURED_COORDINATES(
            self.x, self.y, self.capture_id))


type ClickPosition = Annotated[
    Coordinates | ElementPosition | CapturedCoordinates,
    Field(discriminator="kind"),
]

# --- --- --- --- --- ---

type KeyName = Literal[
    # Letters
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
    "k", "l", "m", "n", "o", "p", "q", "r", "s", "t",
    "u", "v", "w", "x", "y", "z",

    # Digits
    "0", "1", "2", "3", "4",
    "5", "6", "7", "8", "9",

    # Special
    "return",
    "tab",
    "escape",
    "space",
    "delete",

    # Navigation
    "up",
    "down",
    "left",
    "right",
    "home",
    "end",
    "pageup",
    "pagedown",

    # Function
    "f1", "f2", "f3", "f4", "f5", "f6",
    "f7", "f8", "f9", "f10", "f11", "f12",
]

type Modifier = Literal[
    "ctrl",
    "shift",
    "alt",
    "meta",
    "fn",
]

# --- --- --- --- --- ---

class ClickButton(StrEnum):
    LEFT = "left"
    RIGHT = "right"
    MIDDLE = "middle"

    def to_driver(self) -> DriverClickButton:
        return DriverClickButton[self.name]


class InputDeliveryMode(StrEnum):
    BACKGROUND = "background"
    FOREGROUND = "foreground"

    def to_driver(self) -> DriverInputDeliveryMode:
        return DriverInputDeliveryMode[self.name]


class ScrollDirection(StrEnum):
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"

    def to_driver(self) -> DriverScrollDirection:
        return DriverScrollDirection[self.name]

class DragCoordinates(BaseModel):
    x: float
    y: float
