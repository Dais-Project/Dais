import type { WorkspaceCreate } from "@/api/generated/schemas";

// TODO: remove this
export const DEFAULT_WORKSPACE = {
  name: "",
  directory: "",
  workspace_background: "",
  usable_agent_ids: [],
} satisfies Partial<WorkspaceCreate>;
