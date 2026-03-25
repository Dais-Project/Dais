import type { SkillCreate, SkillRead, SkillUpdate } from "@/api/generated/schemas";
import { arboristDataToResources, resourcesToArboristData, TreeItem } from "@/components/custom/editor/ArboristTree";

export type SkillCreateFormValues = Omit<SkillCreate, "resources"> & {
  resources: TreeItem[];
};

export type SkillEditFormValues = Omit<SkillRead, "resources"> & {
  resources: TreeItem[];
};

export function skillToEditFormValues(skill: SkillRead): SkillEditFormValues {
  return {
    ...skill,
    resources: resourcesToArboristData(skill.resources),
  }
}

export function createFormValuesToPayload(
  values: SkillCreateFormValues
): SkillCreate {
  return {
    ...values,
    resources: arboristDataToResources(values.resources),
  };
}

export function editFormValuesToPayload(
  values: SkillEditFormValues
): SkillUpdate {
  return {
    ...values,
    resources: arboristDataToResources(values.resources),
  };
}
