import { z } from "zod";
import type {
  ExecutionControlFinishTask,
  ExecutionControlUpdateTodos,
  FileSystemFindFiles,
  FileSystemListDirectory,
  FileSystemReadFile,
  FileSystemSearchText,
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
  offset: z.number().int().optional(),
  max_lines: z.number().int().optional(),
});

export const WriteFileToolSchema: z.ZodType<FileSystemWriteFile> = z.object({
  path: z.string(),
  content: z.string(),
});

export const FindFilesToolSchema: z.ZodType<FileSystemFindFiles> = z.object({
  pattern: z.string(),
  path: z.string().optional(),
  limit: z.number().int().optional(),
  show_all: z.boolean().optional(),
});

export const SearchTextToolSchema: z.ZodType<FileSystemSearchText> = z.object({
  regex: z.string(),
  path: z.string().optional(),
  file_pattern: z.string().nullish(),
});

export const ListDirectoryToolSchema: z.ZodType<FileSystemListDirectory> = z.object({
  path: z.string().optional(),
  recursive: z.boolean().optional(),
  max_depth: z.number().int().nullish(),
  show_all: z.boolean().optional(),
});
