import type {
  ContentBlockMetadata,
  TaskResourceMetadata,
} from "@/api/generated/schemas";
import { UrlResourceMetadataType } from "@/api/generated/schemas";
import type {
  UiAssistantMessage,
  UiSystemMessage,
  UiToolMessage,
  UiUserMessage,
} from "./ui-message";

type Message =
  | UiSystemMessage
  | UiUserMessage
  | UiAssistantMessage
  | UiToolMessage;

export function isUserMessage(message: Message): message is UiUserMessage {
  return message.role === "user";
}

export function isAssistantMessage(
  message: Message,
): message is UiAssistantMessage {
  return message.role === "assistant";
}

export function isToolMessage(message: Message): message is UiToolMessage {
  return message.role === "tool";
}

export function isSystemMessage(message: Message): message is UiSystemMessage {
  return message.role === "system";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isTaskResourceMetadata(
  value: unknown,
): value is TaskResourceMetadata {
  if (!isRecord(value)) {
    return false;
  }

  if ("text" in value) {
    return (
      typeof value.resource_id === "string" && typeof value.text === "string"
    );
  }

  if ("url" in value) {
    return (
      typeof value.resource_id === "string" &&
      typeof value.url === "string" &&
      Object.values(UrlResourceMetadataType).includes(value.type as never)
    );
  }

  return (
    typeof value.resource_id === "number" &&
    typeof value.filename === "string" &&
    typeof value.mimetype === "string"
  );
}

export function isTaskResourceMetadataList(
  value: unknown,
): value is TaskResourceMetadata[] {
  return Array.isArray(value) && value.every(isTaskResourceMetadata);
}
