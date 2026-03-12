import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateToolsetQueries, useCreateToolset } from "@/api/toolset";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DynamicConfigFields } from "./fields/DynamicConfigFields";
import { ToolsetTypeSelectField } from "./fields/ToolsetTypeSelectField";
import {
  createFormValuesToPayload,
  type ToolsetCreateFormValues,
} from "./form-types";

type ToolsetCreateProps = {
  onConfirm?: () => void;
};

export function ToolsetCreateForm({ onConfirm }: ToolsetCreateProps) {
  const { t } = useTranslation("tabs-toolset");

  const createMutation = useCreateToolset({
    mutation: {
      async onSuccess(newToolset) {
        await invalidateToolsetQueries();
        toast.success(t("toast.create.success_title"), {
          description: t("toast.create.success_description_with_name", { name: newToolset.name }),
        });
        onConfirm?.();
      }
    },
  });

  function handleSubmit(data: ToolsetCreateFormValues) {
    const payload = createFormValuesToPayload(data);
    createMutation.mutate({ data: payload });
  }

  return (
    <FormShell<ToolsetCreateFormValues> onSubmit={handleSubmit}>
      <NameField fieldName="name" fieldProps={{ label: t("form.name.label") }} />

      <ToolsetTypeSelectField />

      <DynamicConfigFields />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
