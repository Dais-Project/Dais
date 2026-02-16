import type { WorkspaceCreate, WorkspaceRead } from "@/api/generated/schemas";

export type WorkspaceBaseFormValues = WorkspaceCreate;
export type WorkspaceCreateFormValues = WorkspaceBaseFormValues;
export type WorkspaceEditFormValues = WorkspaceBaseFormValues;

export function workspaceToEditFormValues(
  workspace: WorkspaceRead
): WorkspaceEditFormValues {
  return {
    name: workspace.name,
    directory: workspace.directory,
    workspace_background: workspace.workspace_background,
    usable_agent_ids: workspace.usable_agents.map((agent) => agent.id),
  };
}
