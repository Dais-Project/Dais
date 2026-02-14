import type {
  AssistantMessage,
  SystemMessage,
  ToolMessage,
  UserMessage,
} from "@/api/generated/schemas";

export type Message =
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | SystemMessage;

export function isUserMessage(message: Message): message is UserMessage {
  return message.role === "user";
}

export function isAssistantMessage(
  message: Message
): message is AssistantMessage {
  return message.role === "assistant";
}

export function isToolMessage(message: Message): message is ToolMessage {
  return message.role === "tool";
}

export function isSystemMessage(message: Message): message is SystemMessage {
  return message.role === "system";
}

export function isToolMessageCompleted(message: ToolMessage) {
  return message.result !== null || message.error !== null;
}

// --- --- --- --- --- ---

export type TextChunk = {
  content: string;
};

export type ToolCallChunk = {
  id?: string;
  name?: string;
  arguments: string;
  index: number;
};
