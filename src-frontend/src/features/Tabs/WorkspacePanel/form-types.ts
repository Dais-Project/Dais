import type {
  WorkspaceCreate,
  WorkspaceRead,
  WorkspaceUpdate,
} from "@/api/generated/schemas";
import {
  arboristDataToResources,
  resourcesToArboristData,
  type TreeItem,
} from "@/components/custom/file-tree";

export type WorkspaceCreateFormValues = Omit<WorkspaceCreate, "notes"> & {
  notes: TreeItem[];
};

export type WorkspaceEditFormValues = Omit<WorkspaceCreate, "notes"> & {
  notes: TreeItem[];
};

export function workspaceToEditFormValues(
  workspace: WorkspaceRead
): WorkspaceEditFormValues {
  return {
    name: workspace.name,
    directory: workspace.directory,
    instruction: workspace.instruction,
    notes: resourcesToArboristData(workspace.notes),
    usable_agent_ids: workspace.usable_agents.map((agent) => agent.id),
    usable_tool_ids: workspace.usable_tools.map((tool) => tool.id),
    usable_skill_ids: workspace.usable_skills.map((skill) => skill.id),
  };
}

export function createFormValuesToPayload(
  values: WorkspaceCreateFormValues
): WorkspaceCreate {
  return {
    ...values,
    notes: arboristDataToResources(values.notes),
  };
}

export function editFormValuesToPayload(
  values: WorkspaceEditFormValues
): WorkspaceUpdate {
  return {
    ...values,
    notes: arboristDataToResources(values.notes),
  };
}

