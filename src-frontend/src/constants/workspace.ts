import { resourcesToArboristData } from "@/components/custom/file-tree";
import type { WorkspaceCreateFormValues } from "@/features/Tabs/WorkspacePanel/form-types";

export const DEFAULT_WORKSPACE: WorkspaceCreateFormValues = {
  name: "",
  directory: "",
  instruction: "",
  notes: resourcesToArboristData([
    { relative: "NOTES.md", content: ""}
  ]),
  usable_agent_ids: [],
  usable_tool_ids: [],
  usable_skill_ids: [],
};
