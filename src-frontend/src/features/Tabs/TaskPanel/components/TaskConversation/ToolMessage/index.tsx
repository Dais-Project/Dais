// import type { ToolMessage as ToolMessageType } from "@/types/message";
import {
  BuiltInTools,
  type ToolMessage as ToolMessageType,
} from "@/api/generated/schemas";
import { AskUserToolMessage } from "./AskUserToolMessage";
import { FinishTaskToolMessage } from "./FinishTaskToolMessage";
import { GeneralToolMessage } from "./GeneralToolMessage";

type ToolMessageProps = {
  message: ToolMessageType;
};

export function ToolMessage({ message }: ToolMessageProps) {
  switch (message.name) {
    case BuiltInTools.UserInteraction__ask_user:
      return <AskUserToolMessage message={message} />;
    case BuiltInTools.ExecutionControl__finish_task:
      return <FinishTaskToolMessage message={message} />;
    default:
      return <GeneralToolMessage message={message} />;
  }
}
