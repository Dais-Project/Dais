import type { SkillCreate, SkillRead } from "@/api/generated/schemas";
import { resourcesToArboristData, TreeItem } from "@/components/custom/editor/ArboristTree";

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
    resources: values.resources.map((r) => ({
      relative: r.id,
      content: r.content!,
    })),
  };
}
