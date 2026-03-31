import { z } from "zod";
import type {
  ContextControlLoadSkill,
  ExecutionControlFinishTask,
  ExecutionControlUpdateTodos,
  FileSystemEditFile,
  FileSystemFindFiles,
  FileSystemListDirectory,
  FileSystemReadFile,
  FileSystemSearchText,
  FileSystemWriteFile,
  OsInteractionsShell,
  UserInteractionAskUser,
  UserInteractionShowPlan,
  WebInteractionFetch,
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

/* --- Web Interaction Tools --- */

export const FetchToolSchema: z.ZodType<WebInteractionFetch> = z.object({
  url: z.string(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
  headers: z.record(z.string(), z.string()).nullish(),
  body: z.string().nullish(),
  raw: z.boolean().optional(),
});

/* --- Web Interaction Tools --- */

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

export const EditFileToolSchema: z.ZodType<FileSystemEditFile> = z.object({
  path: z.string(),
  old_content: z.string(),
  new_content: z.string(),
  expected_replacements: z.number().int().optional(),
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
