from dataclasses import dataclass
from loguru import logger
from dais_sdk.types import ToolDef, ToolMessage
from ..tool.types import is_tool_metadata
from ..prompts import USER_DENIED_TOOL_CALL_RESULT
from ..types import (
    ToolDeniedEvent, ToolEvent,
    ToolRequirePermissionEvent, ToolRequireUserResponseEvent
)
from ..types.metadata import ToolMessageMetadata, UserApprovalStatus, is_agent_tool_metadata

@dataclass
class ToolCallBlocked:
    event: ToolEvent

@dataclass
class ToolCallApproved: ...

class ToolCallReviewer:
    _logger = logger.bind(name="ToolCallReviewer")

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

    def check_permission(self, tool: ToolDef, message: ToolMessage) -> ToolCallBlocked | ToolCallApproved:
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
                # TODO: implement smart approve here
                return ToolCallBlocked(
                    event=ToolRequirePermissionEvent(call_id=message.call_id, tool_name=tool.name))
            case UserApprovalStatus.DENIED:
                message.result = USER_DENIED_TOOL_CALL_RESULT
                return ToolCallBlocked(
                    event=ToolDeniedEvent(call_id=message.call_id))
            case UserApprovalStatus.APPROVED:
                # continue to execute
                return ToolCallApproved()
