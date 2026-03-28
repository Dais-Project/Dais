import { z } from "zod";
import type {
  ContextControlLoadSkill,
  ExecutionControlFinishTask,
  ExecutionControlUpdateTodos,
  FileSystemFindFiles,
  FileSystemListDirectory,
  FileSystemReadFile,
  FileSystemSearchText,
  FileSystemWriteFile,
  OsInteractionsShell,
  UserInteractionAskUser,
  UserInteractionShowPlan,
} from "@/api/generated/schemas";

/* --- User Interaction Tools --- */

export const AskUserToolSchema: z.ZodType<UserInteractionAskUser> = z.object({
  question: z.string(),
  options: z.array(z.string()).nullish(),
});

export const ShowPlanToolSchema: z.ZodType<UserInteractionShowPlan> = z.object({
  plan: z.string(),
  alternatives: z.array(z.string()).nullish(),
});

/* --- User Interaction Tools --- */

/* --- Execution Control Tools --- */

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

/* --- Execution Control Tools --- */

/* --- Context Manage Tools --- */

export const LoadSkillToolSchema: z.ZodType<ContextControlLoadSkill> = z.object({
  id: z.number().int(),
  name: z.string(),
});

/* --- Context Manage Tools --- */

/* --- OS Interaction Tools --- */

export const ShellToolSchema: z.ZodType<OsInteractionsShell> = z.object({
  command: z.string(),
  args: z.array(z.string()).nullish(),
  cwd: z.string().optional(),
  timeout: z.number().int().optional(),
});

/* --- OS Interaction Tools --- */

/* --- File System Tools --- */

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

/* --- File System Tools --- */
