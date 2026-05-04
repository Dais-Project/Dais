import { useCallback, useMemo, useState } from "react";
import { BuiltInTools, ToolMessageMetadata } from "@/api/generated/schemas";
import { isToolMessageCompleted, SdkMessage } from "@/types/message";
import type { TaskFlags } from ".";

const INITIAL_FLAGS: TaskFlags = {
  isFinished: false,
  requiresUserResponse: false,
  requiresUserPermission: false,
};

export function resolveInitialFlags(messages: SdkMessage[]): TaskFlags {
  let requiresUserResponse = false;
  let requiresUserPermission = false;

  const lastMessage = messages.at(-1);
  if (lastMessage?.role === "assistant"
   && lastMessage.content !== null
   && lastMessage.content.length > 0) {
    return {
      isFinished: false,
      requiresUserResponse: true,
      requiresUserPermission: false,
    }
  }

  for (const message of messages.reverseIter()) {
    if (message.role === "assistant") {
      break;
    }
    if (message.role !== "tool") continue;
    if (message.name === BuiltInTools.ExecutionControl__finish_task) {
      return {
        isFinished: true,
        requiresUserResponse: false,
        requiresUserPermission: false,
      };
    }
    if (!isToolMessageCompleted(message)) {
      if (message.name === BuiltInTools.UserInteraction__ask_user || message.name === BuiltInTools.UserInteraction__show_plan) {
        requiresUserResponse = true;
        break;
      }
      const userApproval = (lastMessage.metadata as ToolMessageMetadata)?.user_approval;
      if (userApproval === "pending") {
        requiresUserPermission = true;
      }
    }
  }

  return {
    isFinished: false,
    requiresUserResponse,
    requiresUserPermission,
  };
}

export function useTaskFlags(initialFlags: TaskFlags | (() => TaskFlags) = INITIAL_FLAGS) {
  const [flags, setFlags] = useState<TaskFlags>(initialFlags);
  const reset = useCallback(() => setFlags(INITIAL_FLAGS), [setFlags]);
  const setFlag = useCallback((newFlags: Partial<TaskFlags>) => {
    setFlags((prev) => ({ ...prev, ...newFlags }));
  }, [setFlags]);

  return useMemo(() => ({
    flags,
    setFlag,
    reset,
  }), [flags, setFlag, reset]);
}
