import { CheckIcon } from "lucide-react";
import { useMemo } from "react";
import type { ExecutionControlUpdateTodosTodosItem as TodoItem } from "@/api/generated/schemas";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAgentTaskState } from "../../hooks/use-agent-task";
import { TodoList } from "../TodoList";

function getCurrentTodo(todos: TodoItem[]): TodoItem | null {
  const inProgress = todos.find((todo) => todo.status === "in_progress");
  if (inProgress) {
    return inProgress;
  }

  return todos.find((todo) => todo.status !== "completed" && todo.status !== "cancelled") ?? null;
}

export function TaskProgress({ className }: { className?: string }) {
  const { todos } = useAgentTaskState();
  const currentTodo = useMemo(() => {
    if (!todos) {
      return null;
    }
    return getCurrentTodo(todos);
  }, [todos]);

  if (!todos || todos.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className={cn("justify-start", className)} type="button" variant="ghost">
          {currentTodo && <span className="truncate">{currentTodo.description}</span>}
          {!currentTodo && (
            <span className="text-success">
              <CheckIcon />
              任务已完成
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <TodoList todos={todos} />
      </PopoverContent>
    </Popover>
  );
}
