import type {
  WorkspaceCreate,
  WorkspaceNotesUpdate,
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

export type WorkspaceEditFormValues = Omit<WorkspaceCreate, "notes">;

export type WorkspaceNotesEditFormValues = {
  notes: TreeItem[];
};

export function workspaceToEditFormValues(
  workspace: WorkspaceRead
): WorkspaceEditFormValues {
  return {
    name: workspace.name,
    directory: workspace.directory,
    instruction: workspace.instruction,
    usable_agent_ids: workspace.usable_agents.map((agent) => agent.id),
    usable_tool_ids: workspace.usable_tools.map((tool) => tool.id),
    usable_skill_ids: workspace.usable_skills.map((skill) => skill.id),
  };
}

export function workspaceToNotesEditFormValues(
  workspace: WorkspaceRead
): WorkspaceNotesEditFormValues {
  return {
    notes: resourcesToArboristData(workspace.notes),
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
  values: WorkspaceEditFormValues,
): WorkspaceUpdate {
  return values;
}

export function notesEditFormValuesToPayload(
  values: WorkspaceNotesEditFormValues,
): WorkspaceNotesUpdate {
  return {
    notes: arboristDataToResources(values.notes),
  };
}
