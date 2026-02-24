import { BuiltInTools, type ToolMessage as ToolMessageType } from "@/api/generated/schemas";
import { GeneralToolMessage } from "../GeneralToolMessage";
import { AskUserToolMessage } from "./AskUserToolMessage";
import { FinishTaskToolMessage } from "./FinishTaskToolMessage";
import { UpdateTodosToolMessage } from "./UpdateTodosToolMessage";

type ToolMessageProps = {
  message: ToolMessageType;
};

export function ToolMessage({ message }: ToolMessageProps) {
  switch (message.name) {
    case BuiltInTools.UserInteraction__ask_user:
      return <AskUserToolMessage message={message} />;
    case BuiltInTools.ExecutionControl__finish_task:
      return <FinishTaskToolMessage message={message} />;
    case BuiltInTools.ExecutionControl__update_todos:
      return <UpdateTodosToolMessage message={message} />;
    default:
      return <GeneralToolMessage message={message} />;
  }
}
