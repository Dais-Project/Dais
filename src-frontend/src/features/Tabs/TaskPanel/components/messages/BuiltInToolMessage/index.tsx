import { BuiltInTools, type ToolMessage as ToolMessageType } from "@/api/generated/schemas";
import { GeneralToolMessage } from "../GeneralToolMessage";
import { AskUser } from "./AskUser";
import { FinishTask } from "./FinishTask";
import { ShowPlan } from "./ShowPlan";
import { UpdateTodos } from "./UpdateTodos";

type ToolMessageProps = {
  message: ToolMessageType;
};

export function ToolMessage({ message }: ToolMessageProps) {
  switch (message.name) {
    case BuiltInTools.UserInteraction__ask_user:
      return <AskUser message={message} />;
    case BuiltInTools.UserInteraction__show_plan:
      return <ShowPlan message={message} />;
    case BuiltInTools.ExecutionControl__finish_task:
      return <FinishTask message={message} />;
    case BuiltInTools.ExecutionControl__update_todos:
      return <UpdateTodos message={message} />;
    default:
      return <GeneralToolMessage message={message} />;
  }
}
