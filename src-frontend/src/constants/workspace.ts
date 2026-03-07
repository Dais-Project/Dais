import type { WorkspaceCreate } from "@/api/generated/schemas";

export const DEFAULT_WORKSPACE = {
  name: "",
  directory: "",
  instruction: "",
  usable_agent_ids: [],
  usable_tool_ids: [],
} satisfies WorkspaceCreate;
