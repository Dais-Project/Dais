import type { AssistantMessage, SystemMessage, ToolMessage, UserMessage } from "@/api/generated/schemas";

export type SdkMessage =
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | SystemMessage;

export type SdkSystemMessage = SystemMessage;

export type SdkUserMessage = UserMessage;

export type SdkAssistantMessage = AssistantMessage;

export type SdkToolMessage = ToolMessage;
