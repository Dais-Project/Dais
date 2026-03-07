import { ToolMessageArguments } from "@/api/generated/schemas";
import { SdkMessage } from "./sdk-message";
import { UiAssistantMessage, UiMessage, UiToolMessage, UiUserMessage } from "./ui-message";

export function isToolMessageCompleted(message: UiToolMessage) {
  return message.result !== null || message.error !== null;
}

export function uiUserMessageFactory(content: string): UiUserMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    isStreaming: false,
    content,
  };
}

export function uiAssistantMessageFactory(id?: string, content?: string): UiAssistantMessage {
  return {
    id,
    role: "assistant",
    content: content ?? null,
    reasoning_content: null,
    tool_calls: null,
    usage: null,
    isStreaming: true,
  };
}

export function uiToolMessageFactory(
  callId: string,
  name: string,
  args: string | ToolMessageArguments
): UiToolMessage {
  const isStreaming = typeof args === "string";
  return {
    name,
    isStreaming,
    call_id: callId,
    role: "tool",
    arguments: args,
    result: null,
    error: null,
    metadata: {},
  } as UiToolMessage;
}

export function toUiMessage(value: SdkMessage): UiMessage;
export function toUiMessage(value: SdkMessage[]): UiMessage[];
export function toUiMessage(value: SdkMessage | SdkMessage[]): UiMessage | UiMessage[] {
  if (!Array.isArray(value)) {
    return { ...value, isStreaming: false };
  }
  const result: UiMessage[] = [];
  for (const message of value) {
    result.push({ ...message, isStreaming: false });
  }
  return result;
}

export function toSdkMessage(value: UiMessage): SdkMessage;
export function toSdkMessage(value: UiMessage[]): SdkMessage[];
export function toSdkMessage(value: UiMessage | UiMessage[]): SdkMessage | SdkMessage[] {
  if (!Array.isArray(value)) {
    if (value.isStreaming) {
      throw new Error("Cannot convert streaming tool message to SDK message");
    }
    const { isStreaming, ...sdkMessage } = value;
    return sdkMessage;
  }
  const result: SdkMessage[] = [];
  for (const message of value) {
    if (message.isStreaming) {
      throw new Error("Cannot convert streaming tool message to SDK message");
    }
    const { isStreaming, ...sdkMessage } = message;
    result.push(sdkMessage);
  }
  return result;
}
