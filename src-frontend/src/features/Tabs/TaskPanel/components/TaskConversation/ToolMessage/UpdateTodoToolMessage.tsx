import { ListTodoIcon } from "lucide-react";
import type { ExecutionControlUpdateTodos, ToolMessage as ToolMessageType } from "@/api/generated/schemas";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { CustomTool } from "@/components/custom/ai-components/CustomTool";
import { TodoList } from "@/features/Tabs/TaskPanel/components/TodoList";
import { useToolArgument } from "../../../hooks/use-tool-argument";

export type UpdateTodoToolMessageProps = {
  message: ToolMessageType;
};

export function UpdateTodoToolMessage({ message }: UpdateTodoToolMessageProps) {
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
    <CustomTool title="已更新任务待办" icon={<ListTodoIcon className="size-4 text-muted-foreground" />} defaultOpen>
      {content}
    </CustomTool>
  );
}
