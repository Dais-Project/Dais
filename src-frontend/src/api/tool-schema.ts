import { z } from "zod";
import type { ExecutionControlUpdateTodosTodosItem as TodoItem } from "@/api/generated/schemas";

export const TodoListSchema: z.ZodType<TodoItem[]> = z.array(
  z.object({
    description: z.string(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  })
);
