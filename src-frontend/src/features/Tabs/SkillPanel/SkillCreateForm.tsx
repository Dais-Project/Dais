import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateSkillQueries, useCreateSkill } from "@/api/skill";
import { TABS_SKILL_NAMESPACE } from "@/i18n/resources";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { SkillDescriptionField } from "./fields/SkillDescriptionField";
import { type SkillCreateFormValues } from "./form-types";

type SkillCreateFormProps = {
  onConfirm?: () => void;
};

export function SkillCreateForm({ onConfirm }: SkillCreateFormProps) {
  const { t } = useTranslation(TABS_SKILL_NAMESPACE);

  const createMutation = useCreateSkill({
    mutation: {
      async onSuccess(newSkill) {
        await invalidateSkillQueries();
        toast.success(t("toast.create.success_title"), {
          description: t("toast.create.success_description_with_name", { name: newSkill.name }),
        });
        onConfirm?.();
      },
    },
  });

  const handleSubmit = (data: SkillCreateFormValues) => {
    createMutation.mutate({ data });
  };

  return (
    <FormShell<SkillCreateFormValues> onSubmit={handleSubmit}>
      <NameField fieldName="name" fieldProps={{ label: t("form.name.label") }} />

      <SkillDescriptionField />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}