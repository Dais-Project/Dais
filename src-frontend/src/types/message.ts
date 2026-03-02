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

export function toolMessageFactory(
  id: string,
  name: string,
  arguments_: string
): Omit<ToolMessage, "id"> {
  return {
    role: "tool",
    tool_call_id: id,
    name,
    arguments: arguments_,
    result: null,
    error: null,
    metadata: {},
  };
}

export function assistantMessageFactory(): Omit<AssistantMessage, "id"> {
  return {
    role: "assistant",
    content: "",
    usage: null,
    reasoning_content: null,
    tool_calls: null,
    audio: null,
    images: null,
  };
}

export function userMessageFactory(content: string): UserMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
    attachments: null,
  };
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
