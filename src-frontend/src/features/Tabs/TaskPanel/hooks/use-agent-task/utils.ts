import type { AssistantMessage, ToolMessage } from "@/api/generated/schemas";

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
