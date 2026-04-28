import { TaskType } from "@/api/generated/schemas";
import type { dynamicIconImports } from "lucide-react/dynamic";

export type TabBase = {
  title: string;
  icon?: keyof typeof dynamicIconImports;
};

type SpecificTab<Name extends string, Metadata> = TabBase & {
  type: Name;
  metadata: Metadata;
};

export type TaskTabMetadata = { workspace_id: number, type: TaskType } & (
  | { type: "task", isDraft: true }
  | { type: "task", isDraft: false, id: number }
  | { type: "schedule", id: number } // schedule run record
);

export type WorkspaceTabMetadata =
  | { mode: "create" }
  | { mode: "edit"; id: number }
  | { mode: "edit-notes"; id: number };

export type AgentTabMetadata =
  | { mode: "create" }
  | { mode: "edit"; id: number };

export type ProviderTabMetadata =
  | { mode: "create" }
  | { mode: "edit"; id: number };

export type ToolsetTabMetadata =
  | { mode: "create" }
  | { mode: "edit"; id: number };

export type SkillTabMetadata =
  | { mode: "create" }
  | { mode: "edit"; id: number };

export type ScheduleTabMetadata =
  | { mode: "create" }
  | { mode: "edit"; id: number }
  | { mode: "records"; id: number };

export type Tab =
  | SpecificTab<"task", TaskTabMetadata>
  | SpecificTab<"workspace", WorkspaceTabMetadata>
  | SpecificTab<"agent", AgentTabMetadata>
  | SpecificTab<"provider", ProviderTabMetadata>
  | SpecificTab<"toolset", ToolsetTabMetadata>
  | SpecificTab<"skill", SkillTabMetadata>
  | SpecificTab<"schedule", ScheduleTabMetadata>;
