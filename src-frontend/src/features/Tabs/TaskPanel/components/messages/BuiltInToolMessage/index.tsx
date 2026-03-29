import { BuiltInTools } from "@/api/generated/schemas";
import type { UiToolMessage } from "@/types/message";
import { GeneralToolMessage } from "../GeneralToolMessage";
import { AskUser } from "./AskUser";
import { EditFile } from "./EditFile";
import { FinishTask } from "./FinishTask";
import { FindFiles } from "./FindFiles";
import { ListDirectory } from "./ListDirectory";
import { LoadSkill } from "./LoadSkill";
import { ReadFile } from "./ReadFile";
import { SearchText } from "./SearchText";
import { ShowPlan } from "./ShowPlan";
import { UpdateTodos } from "./UpdateTodos";
import { WriteFile } from "./WriteFile";
import { Shell } from "./Shell";

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
    case BuiltInTools.FileSystem__read_file:
      return <ReadFile {...props} />;
    case BuiltInTools.FileSystem__write_file:
      return <WriteFile {...props} />;
    case BuiltInTools.FileSystem__edit_file:
      return <EditFile {...props} />;
    case BuiltInTools.FileSystem__find_files:
      return <FindFiles {...props} />;
    case BuiltInTools.FileSystem__list_directory:
      return <ListDirectory {...props} />;
    case BuiltInTools.FileSystem__search_text:
      return <SearchText {...props} />;
    case BuiltInTools.ContextControl__load_skill:
      return <LoadSkill {...props} />;
    case BuiltInTools.OsInteractions__shell:
      return <Shell {...props} />;
    default:
      return <GeneralToolMessage {...props} />;
  }
}
