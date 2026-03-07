import { ListTodoIcon } from "lucide-react";
import type { ExecutionControlUpdateTodos } from "@/api/generated/schemas";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { CustomTool, CustomToolContent } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/CustomTool";
import { TodoList } from "@/features/Tabs/TaskPanel/components/TodoList";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { useToolState } from "../../../hooks/use-tool-state";

export function UpdateTodos({ message }: ToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const state = useToolState(message);
  const toolArguments = useToolArgument<ExecutionControlUpdateTodos>(message, UpdateTodosSchema);
  const todos = toolArguments?.todos ?? [];

  const content = (() => {
    if (message.isStreaming) {
      return null;
    }
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
        reviewTool(message.call_id, reaction, false);
      }}
    >
      <CustomToolContent>
        {content}
      </CustomToolContent>
    </CustomTool>
  );
}
