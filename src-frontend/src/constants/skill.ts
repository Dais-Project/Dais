import type { SkillCreateFormValues } from "@/features/Tabs/SkillPanel/form-types";

export const DEFAULT_SKILL: SkillCreateFormValues = {
  name: "",
  description: "",
  is_enabled: true,
  content: "",
  resources: [],
};
