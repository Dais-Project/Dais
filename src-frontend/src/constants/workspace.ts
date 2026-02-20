import type { WorkspaceCreate } from "@/api/generated/schemas";

export const DEFAULT_WORKSPACE = {
  name: "",
  directory: "",
  workspace_background: "",
  usable_agent_ids: [],
} satisfies WorkspaceCreate;
