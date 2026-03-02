import { z } from "zod";
import type {
  ExecutionControlUpdateTodos,
  UserInteractionAskUser,
  UserInteractionShowPlan,
} from "@/api/generated/schemas";

export const AskUserToolSchema: z.ZodType<UserInteractionAskUser> = z.object({
  question: z.string(),
  options: z.array(z.string()).optional(),
});

export const ShowPlanToolSchema: z.ZodType<UserInteractionShowPlan> = z.object({
  plan: z.string(),
});

export const UpdateTodosSchema: z.ZodType<ExecutionControlUpdateTodos> = z.object({
  todos: z.array(
    z.object({
      description: z.string(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
    })
  ),
});
