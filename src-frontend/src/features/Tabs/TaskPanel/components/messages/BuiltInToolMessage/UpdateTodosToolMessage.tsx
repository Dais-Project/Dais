import { ListTodoIcon } from "lucide-react";
import type { ExecutionControlUpdateTodos, ToolMessage as ToolMessageType } from "@/api/generated/schemas";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { CustomTool } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/CustomTool";
import { TodoList } from "@/features/Tabs/TaskPanel/components/TodoList";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolState } from "../../../hooks/use-tool-state";

export type UpdateTodosToolMessageProps = {
  message: ToolMessageType;
};

export function UpdateTodosToolMessage({ message }: UpdateTodosToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const state = useToolState(message);
  const toolArguments = useToolArgument<ExecutionControlUpdateTodos>(message.arguments, UpdateTodosSchema);
  const todos = toolArguments?.todos ?? [];

  const content = (() => {
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">待办参数解析失败</p>;
    }
    if (todos.length === 0) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">暂无待办更新</p>;
    }
    return (
      <div className="px-2 pb-4">
        <TodoList todos={todos} />
      </div>
    );
  })();

  return (
    <CustomTool
      title="已更新任务待办"
      icon={<ListTodoIcon className="size-4 text-muted-foreground" />}
      defaultOpen
      state={state}
      onUserReaction={(approved) => {
        const reaction = approved ? "approved" : "denied";
        reviewTool(message.tool_call_id, reaction, false);
      }}
    >
      {content}
    </CustomTool>
  );
}
