from typing import Any, Protocol
from pydantic import BaseModel, field_serializer
from cua_driver import (
    ActionEffect, ActionRoute, ActionDelivery, ActionEvidence, ActionEscalation
)

class ActionErrorLike(Protocol):
    code: str
    hint: str | None

class ActionResultModel(BaseModel):
    effect: ActionEffect
    route: ActionRoute
    delivery: ActionDelivery | None
    evidence: ActionEvidence | None
    escalation: ActionEscalation | None
    error: ActionErrorLike | None
    summary: str | None

    @field_serializer("effect")
    def serialize_effect(cls, v: ActionEffect) -> str:
        return v.name

    @field_serializer("route")
    def serialize_route(cls, v: ActionRoute) -> str:
        return v.name

    @field_serializer("delivery")
    def serialize_delivery(cls, v: ActionDelivery) -> dict[str, Any]:
        dict: dict[str, Any] = { "mode": v.mode.name }
        if v.delivered_count is not None:
            dict["delivered_count"] = v.delivered_count
        return dict

    @field_serializer("evidence")
    def serialize_evidence(cls, v: ActionEvidence) -> dict[str, Any]:
        dict: dict[str, Any] = { "kind": v.kind.name }
        if v.detail is not None:
            dict["detail"] = v.detail
        return dict

    @field_serializer("escalation")
    def serialize_escalation(cls, v: ActionEscalation) -> dict[str, Any]:
        return {
            "target": v.target.name,
            "reason": v.reason.name,
        }

    @field_serializer("error")
    def serialize_error(cls, v: ActionErrorLike) -> dict[str, Any]:
        return {
            "code": v.code,
            "hint": v.hint,
        }

