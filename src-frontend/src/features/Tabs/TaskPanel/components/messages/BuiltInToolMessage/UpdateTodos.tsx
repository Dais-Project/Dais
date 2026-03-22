import { ListTodoIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { ExecutionControlUpdateTodos, ToolMessageMetadata } from "@/api/generated/schemas";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { BuiltInToolContainer, BuiltInToolContent, BuiltInToolHeader } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/BuiltInTool";
import { TodoList } from "@/features/Tabs/TaskPanel/components/TodoList";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { useToolActionable } from "../../../hooks/use-tool-actionable";

export function UpdateTodos({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<ExecutionControlUpdateTodos>(message, UpdateTodosSchema);
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const todos = toolArguments?.todos ?? [];
  const userApproval = (message.metadata as ToolMessageMetadata).user_approval;

  const content = (() => {
    if (message.isStreaming) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.update_todos.generating")}</p>;
    }
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.update_todos.parse_error")}</p>;
    }
    if (todos.length === 0) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.update_todos.empty")}</p>;
    }
    return (
      <div className="px-2 pb-4">
        <TodoList todos={todos} />
      </div>
    );
  })();

  return (
    <BuiltInToolContainer defaultOpen>
      <BuiltInToolHeader
        title={t("tool.update_todos.title")}
        icon={<ListTodoIcon className="size-4 text-muted-foreground" />}
      />
      <BuiltInToolContent>{content}</BuiltInToolContent>
      {userApproval && (
        <ToolConfirmation
          state={userApproval}
          disabled={disabled}
          onSubmit={markAsSubmitted}
          onAccept={() => reviewTool(message.call_id, "approved", false)}
          onReject={() => reviewTool(message.call_id, "denied", false)}
        />
      )}
    </BuiltInToolContainer>
  );
}
