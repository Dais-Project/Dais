import type { ExecutionControlUpdateTodosTodosItem as TodoItem } from "@/api/generated/schemas";
import {
  Queue,
  QueueItem,
  QueueItemContent,
  QueueItemIndicator,
  QueueSection,
  QueueSectionContent,
} from "@/components/ai-elements/queue";

export function TodoList({ todos }: { todos: TodoItem[] }) {
  if (todos.length === 0) {
    return null;
  }

  return (
    <Queue>
      <QueueSection>
        <QueueSectionContent>
          {todos.map((todo, index) => (
            <QueueItem key={`${todo.description}-${index}`}>
              <div className="flex items-center gap-2">
                <QueueItemIndicator status={todo.status} />
                <QueueItemContent status={todo.status}>{todo.description}</QueueItemContent>
              </div>
            </QueueItem>
          ))}
        </QueueSectionContent>
      </QueueSection>
    </Queue>
  );
}
