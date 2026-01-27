import type { AssistantMessage, ToolMessage } from "@/types/message";

export function toolMessageFactory(
  id: string,
  name: string,
  arguments_: string
): ToolMessage {
  return {
    role: "tool",
    id,
    name,
    arguments: arguments_,
    result: null,
    error: null,
    metadata: {},
  };
}

export function emptyAssistantMessage(): AssistantMessage {
  return {
    role: "assistant",
    content: "",
    reasoning_content: null,
    tool_calls: null,
    audio: null,
    images: null,
  };
}
