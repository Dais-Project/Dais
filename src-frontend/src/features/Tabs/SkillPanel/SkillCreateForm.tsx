import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateSkillQueries, useCreateSkill } from "@/api/skill";
import { TABS_SKILL_NAMESPACE } from "@/i18n/resources";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, RichTextField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DEFAULT_SKILL } from "@/constants/skill";
import { SkillDescriptionField } from "./fields/SkillDescriptionField";
import { createFormValuesToPayload, type SkillCreateFormValues } from "./form-types";
import { SkillResourceField } from "./fields/SkillResourceField";

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
    createMutation.mutate({ data: createFormValuesToPayload(data) });
  };

  return (
    <FormShell<SkillCreateFormValues> values={DEFAULT_SKILL} onSubmit={handleSubmit}>
      <NameField fieldName="name" fieldProps={{ label: t("form.name.label") }} />

      <SkillDescriptionField />

      <RichTextField
        fieldName="content"
        fieldProps={{ label: t("form.content.label") }}
        controlProps={{ className: "mt-2" }}
      />

      <SkillResourceField />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}