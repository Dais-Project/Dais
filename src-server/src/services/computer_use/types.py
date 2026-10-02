from enum import StrEnum
from typing import Annotated, Literal, cast

from cua_driver import (
    ActionTarget as DriverActionTarget,
    ClickButton as DriverClickButton,
    ClickPosition as DriverClickPosition,
    GetWindowStateInput,
    ScrollDirection as DriverScrollDirection,
)
from pydantic import BaseModel, ConfigDict, Field


class ScreenshotOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["screenshot"]
    max_image_dimension: Annotated[int | None, Field(gt=0)] = None

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

    type: Literal["accessibility_tree"]
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
    Field(discriminator="type"),
]


class WindowTarget(BaseModel):
    type: Literal["window"]
    pid: int
    window_id: int

    def to_driver(self) -> DriverActionTarget:
        return cast(DriverActionTarget, DriverActionTarget.WINDOW(self.pid, self.window_id))

class DesktopTarget(BaseModel):
    type: Literal["desktop"]
    display_id: Literal["primary"] = "primary"

    def to_driver(self) -> DriverActionTarget:
        return cast(DriverActionTarget, DriverActionTarget.DESKTOP(self.display_id))

type ActionTarget = Annotated[WindowTarget | DesktopTarget, Field(discriminator="type")]


class Coordinates(BaseModel):
    type: Literal["coordinates"]
    x: float
    y: float

    def to_driver(self) -> DriverClickPosition:
        return cast(DriverClickPosition, DriverClickPosition.COORDINATES(self.x, self.y))

class ElementPosition(BaseModel):
    type: Literal["element"]
    element_token: str

    def to_driver(self) -> DriverClickPosition:
        return cast(DriverClickPosition, DriverClickPosition.ELEMENT(self.element_token))

class CapturedCoordinates(BaseModel):
    type: Literal["captured_coordinates"]
    x: float
    y: float
    capture_id: str

    def to_driver(self) -> DriverClickPosition:
        return cast(DriverClickPosition, DriverClickPosition.CAPTURED_COORDINATES(
            self.x, self.y, self.capture_id))


type ClickPosition = Annotated[
    Coordinates | ElementPosition | CapturedCoordinates,
    Field(discriminator="type"),
]


class ClickButton(StrEnum):
    LEFT = "left"
    RIGHT = "right"
    MIDDLE = "middle"

    def to_driver(self) -> DriverClickButton:
        return DriverClickButton[self.name]


class ScrollDirection(StrEnum):
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"

    def to_driver(self) -> DriverScrollDirection:
        return DriverScrollDirection[self.name]
