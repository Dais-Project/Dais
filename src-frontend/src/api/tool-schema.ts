import { z } from "zod";
import type {
  ExecutionControlFinishTask,
  ExecutionControlUpdateTodos,
  FileSystemReadFile,
  FileSystemWriteFile,
  UserInteractionAskUser,
  UserInteractionShowPlan,
} from "@/api/generated/schemas";

export const AskUserToolSchema: z.ZodType<UserInteractionAskUser> = z.object({
  question: z.string(),
  options: z.array(z.string()).nullish(),
});

export const ShowPlanToolSchema: z.ZodType<UserInteractionShowPlan> = z.object({
  plan: z.string(),
  alternatives: z.array(z.string()).nullish(),
});

export const UpdateTodosSchema: z.ZodType<ExecutionControlUpdateTodos> = z.object({
  todos: z.array(
    z.object({
      description: z.string(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
    })
  ),
});

export const FinishTaskSchema: z.ZodType<ExecutionControlFinishTask> = z.object({
  task_summary: z.string(),
});

export const ReadFileToolSchema: z.ZodType<FileSystemReadFile> = z.object({
  path: z.string(),
  enable_line_numbers: z.boolean().optional(),
});

export const WriteFileToolSchema: z.ZodType<FileSystemWriteFile> = z.object({
  path: z.string(),
  content: z.string(),
});
