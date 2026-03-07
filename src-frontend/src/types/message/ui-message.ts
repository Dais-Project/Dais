import type { ToolMessageArguments } from "@/api/generated/schemas";
import type { SdkSystemMessage, SdkUserMessage, SdkAssistantMessage, SdkToolMessage } from "./sdk-message";

type UiBaseMessage = { isStreaming: boolean }

export type UiMessage =
  | UiSystemMessage
  | UiUserMessage
  | UiAssistantMessage
  | UiToolMessage;

export type UiSystemMessage = UiBaseMessage & SdkSystemMessage & {
  isStreaming: false;
};

export type UiUserMessage = UiBaseMessage & SdkUserMessage & {
  isStreaming: false;
};

export type UiAssistantMessage = UiBaseMessage & SdkAssistantMessage;

export type UiToolMessage = UiBaseMessage
  & Omit<SdkToolMessage, "arguments">
  & (
    | ({ isStreaming: true  } & { arguments: string })
    | ({ isStreaming: false } & { arguments: ToolMessageArguments })
  );
