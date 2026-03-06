import type { TaskUsage } from "@/api/generated/schemas";
import type { SdkMessage, SdkToolMessage, ToolCallChunk } from "./message";

export type MessageStartEventData = {
  message_id: string;
};

export type MessageEndEventData = {
  message: SdkMessage;
};

export type MessageChunkEventData =
  | {
      type: "text";
      content: string;
    }
  | ({
      type: "usage";
    } & TaskUsage)
  | {
      type: "tool_call";
      data: ToolCallChunk;
    };

export type MessageReplaceEventData = {
  message: SdkMessage;
};

export type ToolCallEndEventData = {
  message: SdkToolMessage;
};

export type ToolExecutedEventData = {
  call_id: string;
  result: string | null;
};

export type ToolRequireUserResponseEventData = {
  tool_name: string;
};

export type ToolRequirePermissionEventData = {
  call_id: string;
};

export type ErrorEventData = {
  message: string;
};

export type AgentEventType =
  | "USER_MESSAGE_ACK"
  | "MESSAGE_CHUNK"
  | "MESSAGE_START"
  | "MESSAGE_END"
  | "MESSAGE_REPLACE"
  | "TOOL_CALL_END"
  | "TASK_DONE"
  | "TASK_INTERRUPTED"
  | "TOOL_EXECUTED"
  | "TOOL_REQUIRE_USER_RESPONSE"
  | "TOOL_REQUIRE_PERMISSION"
  | "ERROR";
