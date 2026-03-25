import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TABS_SKILL_NAMESPACE } from "@/i18n/resources";
import type { SkillRead } from "@/api/generated/schemas";
import { invalidateSkillQueries, useUpdateSkill } from "@/api/skill";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { SkillDescriptionField } from "./fields/SkillDescriptionField";
import { editFormValuesToPayload, skillToEditFormValues, type SkillEditFormValues } from "./form-types";
import { useMemo } from "react";

type SkillEditFormProps = {
  skill: SkillRead;
  onConfirm?: () => void;
};

export function SkillEditForm({ skill, onConfirm }: SkillEditFormProps) {
  const { t } = useTranslation(TABS_SKILL_NAMESPACE);
  const formValues = useMemo(() => skillToEditFormValues(skill), [skill]);

  const updateMutation = useUpdateSkill({
    mutation: {
      async onSuccess(updatedSkill: { id: number; name: string }) {
        await invalidateSkillQueries(updatedSkill.id);
        toast.success(t("toast.update.success_title"), {
          description: t("toast.update.success_description_with_name", { name: updatedSkill.name }),
        });
        onConfirm?.();
      },
    },
  });

  const handleSubmit = (data: SkillEditFormValues) => {
    updateMutation.mutate({ skillId: skill.id, data: editFormValuesToPayload(data) });
  };

  return (
    <FormShell<SkillEditFormValues> values={formValues} onSubmit={handleSubmit}>
      <NameField fieldName="name" fieldProps={{ label: t("form.name.label") }} />

      <SkillDescriptionField />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? t("form.submit.saving") : t("form.submit.save")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}