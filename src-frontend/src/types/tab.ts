import type { dynamicIconImports } from "lucide-react/dynamic";

export type TabBase = {
  title: string;
  icon?: keyof typeof dynamicIconImports;
};

type SpecificTab<Name extends string, Metadata> = TabBase & {
  type: Name;
  metadata: Metadata;
};

export type TaskTabMetadata = { workspace_id: number } & (
  | { isDraft: true }
  | {
      id: number;
      isDraft: false;
    });

export type WorkspaceTabMetadata =
  | { mode: "create" }
  | { mode: "edit"; id: number };

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

export type Tab =
  | SpecificTab<"task", TaskTabMetadata>
  | SpecificTab<"workspace", WorkspaceTabMetadata>
  | SpecificTab<"agent", AgentTabMetadata>
  | SpecificTab<"provider", ProviderTabMetadata>
  | SpecificTab<"toolset", ToolsetTabMetadata>
  | SpecificTab<"skill", SkillTabMetadata>;
