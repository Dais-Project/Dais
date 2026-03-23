from typing import TYPE_CHECKING
from dataclasses import dataclass
from loguru import logger
from dais_sdk.types import ToolDef, ToolMessage
from dais_sdk.tool.prepare import prepare_tools
from src.settings import use_app_setting_manager
from ..tool.types import is_tool_metadata
from ..prompts import (
    create_one_turn_llm,
    USER_DENIED_TOOL_CALL_RESULT,
    ToolCallSafetyAudit, ToolCallSafetyAuditInput,
)
from ..context import AgentContext
from ..types import (
    ToolDeniedEvent, ToolEvent,
    ToolRequirePermissionEvent, ToolRequireUserResponseEvent
)
from ..types.metadata import ToolMessageMetadata, UserApprovalStatus, is_agent_tool_metadata

if TYPE_CHECKING:
    from .tool_call_dispatcher import ToolCallDispatch


@dataclass
class ToolCallBlocked:
    event: ToolEvent

@dataclass
class ToolCallApproved: ...

class ToolCallReviewer:
    _logger = logger.bind(name="ToolCallReviewer")

    def __init__(self, ctx: AgentContext):
        self._ctx = ctx

    async def audit_tool_calls(self,
                               dispatches: list[ToolCallDispatch]
                               ) -> tuple[
                                   list[ToolCallDispatch],
                                   list[ToolCallDispatch]
                               ] | None:
        """
        Side effect: The risk level will be attached to the metadata of each message.

        Returns:
            - Tuple of (high_risk, low_risk)
            - None if smart approve is disabled or no flash model is configured or audit execution failed.
        """
        if len(dispatches) == 0:
            return [], []

        settings = use_app_setting_manager().settings
        if not settings.smart_approve:
            self._logger.info("Smart approve is disabled, skipping smart approve")
            return None
        if settings.flash_model is None:
            self._logger.warning("No flash model configured, skipping smart approve")
            return None

        audit_context_size = 5
        context = self._ctx.messages[-audit_context_size:]

        try:
            llm = await create_one_turn_llm(settings.flash_model)
            safety_audit = ToolCallSafetyAudit(llm, settings.reply_language)
            tools = [dispatch.tool for dispatch in dispatches]
            messages = [dispatch.message for dispatch in dispatches]
            input = ToolCallSafetyAuditInput(
                tool_definitions=prepare_tools(tools),
                context=context,
                pending_tool_calls=messages
            )
            output = await safety_audit(input)
        except Exception:
            self._logger.exception("Failed to audit tool calls")
            return None

        # attach risk level and reason to each message
        for item in output.results:
            for dispatch in dispatches:
                if dispatch.message.call_id == item.call_id:
                    assert is_agent_tool_metadata(dispatch.message.metadata)
                    dispatch.message.metadata["risk_level"] = item.risk_level
                    dispatch.message.metadata["risk_reason"] = item.reason
                    break
            else:
                self._logger.warning(f"Tool call {item.call_id} not found")
                continue

        # split messages into two groups: high risk and low risk
        high_risk: list[ToolCallDispatch] = []
        low_risk: list[ToolCallDispatch] = []
        for dispatch in dispatches:
            assert is_agent_tool_metadata(dispatch.message.metadata)
            if "risk_level" not in dispatch.message.metadata:
                self._logger.warning(f"Tool call {dispatch.message.call_id} has no risk level")
                continue
            if dispatch.message.metadata["risk_level"] > settings.smart_approve_threshold:
                high_risk.append(dispatch)
            else:
                low_risk.append(dispatch)
        return high_risk, low_risk

    def apply_user_approval(self,
                            call_id: str,
                            metadata: ToolMessageMetadata, 
                            approved: bool) -> bool:
        """
        Try to apply user approval to the metadata.
        Return False if the metadata has already been approved or denied.
        """
        if "user_approval" not in metadata:
            # This should not happen, but we handle it just in case.
            self._logger.warning(f"Tool call {call_id} has no user_approval metadata")
            metadata["user_approval"] = UserApprovalStatus.PENDING

        if metadata["user_approval"] != UserApprovalStatus.PENDING:
            return False

        metadata["user_approval"] = (
            UserApprovalStatus.APPROVED if approved 
            else UserApprovalStatus.DENIED
        )
        return True

    async def check_permission(self, tool: ToolDef, message: ToolMessage) -> ToolCallBlocked | ToolCallApproved:
        # use TypeGuards to assert the type of metadata
        assert is_tool_metadata(tool.metadata)
        assert is_agent_tool_metadata(message.metadata)

        if tool.metadata["needs_user_interaction"]:
            return ToolCallBlocked(event=ToolRequireUserResponseEvent(tool_name=message.name))

        if tool.metadata["auto_approve"] == True:
            return ToolCallApproved()

        # check user_approval state
        if "user_approval" not in message.metadata:
            message.metadata["user_approval"] = UserApprovalStatus.PENDING
        match message.metadata["user_approval"]:
            case UserApprovalStatus.PENDING:
                return ToolCallBlocked(
                    event=ToolRequirePermissionEvent(call_id=message.call_id, tool_name=tool.name))
            case UserApprovalStatus.DENIED:
                message.result = USER_DENIED_TOOL_CALL_RESULT
                return ToolCallBlocked(
                    event=ToolDeniedEvent(call_id=message.call_id))
            case UserApprovalStatus.APPROVED:
                # continue to execute
                return ToolCallApproved()
