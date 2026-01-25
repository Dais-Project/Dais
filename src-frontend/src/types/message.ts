/**
 * Text content in message
 */
export type TextContent = {
  type: "text";
  text: string;
};

/**
 * Image URL content in message
 */
export type ChatCompletionImageURL = {
  url: string;
  detail?: "auto" | "low" | "high";
};

/**
 * Image content in message
 */
export type ImageContent = {
  type: "image_url";
  image_url: ChatCompletionImageURL;
};

export type MessageContent = string | Array<TextContent | ImageContent>;

export type ChatCompletionToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
};

export type ChatCompletionAudioResponse = {
  id: string;
  data: string; // base64 encoded
  expires_at: number;
  transcript: string;
};

// --- --- --- --- --- ---

export type UserMessage = {
  role: "user";
  content: MessageContent;
};

export type AssistantMessage = {
  role: "assistant";
  content: string | null;
  reasoning_content: string | null;
  tool_calls: ChatCompletionToolCall[] | null;
  audio: ChatCompletionAudioResponse | null;
  images: ChatCompletionImageURL[] | null;
};

export type UserApprovalStatus = "pending" | "approved" | "denied";

export type ToolMessage = {
  role: "tool";
  id: string;
  name: string;
  arguments: string;
  result: string | null;
  error: string | null;
  metadata: {
    user_approval?: UserApprovalStatus;
  };
};

export type SystemMessage = {
  role: "system";
  content: string;
};

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
