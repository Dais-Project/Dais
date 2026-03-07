import { BuiltInTools } from "@/api/generated/schemas";
import type { UiToolMessage } from "@/types/message";
import { GeneralToolMessage } from "../GeneralToolMessage";
import { AskUser } from "./AskUser";
import { FinishTask } from "./FinishTask";
import { ShowPlan } from "./ShowPlan";
import { UpdateTodos } from "./UpdateTodos";

export type ToolMessageProps = {
  message: UiToolMessage;
};

export function ToolMessage(props: ToolMessageProps) {
  switch (props.message.name) {
    case BuiltInTools.UserInteraction__ask_user:
      return <AskUser {...props} />;
    case BuiltInTools.UserInteraction__show_plan:
      return <ShowPlan {...props} />;
    case BuiltInTools.ExecutionControl__finish_task:
      return <FinishTask {...props} />;
    case BuiltInTools.ExecutionControl__update_todos:
      return <UpdateTodos {...props} />;
    default:
      return <GeneralToolMessage {...props} />;
  }
}
