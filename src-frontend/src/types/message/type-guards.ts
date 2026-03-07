import type { UiSystemMessage, UiUserMessage, UiAssistantMessage, UiToolMessage } from "./ui-message";

type Message =
  | UiSystemMessage
  | UiUserMessage
  | UiAssistantMessage
  | UiToolMessage;

export function isUserMessage(message: Message): message is UiUserMessage {
  return message.role === "user";
}

export function isAssistantMessage(
  message: Message
): message is UiAssistantMessage {
  return message.role === "assistant";
}

export function isToolMessage(message: Message): message is UiToolMessage {
  return message.role === "tool";
}

export function isSystemMessage(message: Message): message is UiSystemMessage {
  return message.role === "system";
}
