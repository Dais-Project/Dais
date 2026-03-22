import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TABS_TOOLSET_NAMESPACE } from "@/i18n/resources";
import type { ToolsetRead } from "@/api/generated/schemas";
import { invalidateToolsetQueries, useUpdateToolset } from "@/api/toolset";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { CheckboxField, NameField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DynamicConfigFields } from "./fields/DynamicConfigFields";
import { ToolsetTypeSelectField } from "./fields/ToolsetTypeSelectField";
import { editFormValuesToPayload, type ToolsetEditFormValues, toolsetToEditFormValues } from "./form-types";
import { ToolList } from "./ToolList";

type ToolsetEditFormProps = {
  toolset: ToolsetRead;
  onConfirm?: () => void;
};

export function ToolsetEditForm({ toolset, onConfirm }: ToolsetEditFormProps) {
  const { t } = useTranslation(TABS_TOOLSET_NAMESPACE);
  const formValues = useMemo(() => toolsetToEditFormValues(toolset), [toolset]);

  const updateMutation = useUpdateToolset({
    mutation: {
      async onSuccess(updatedToolset: { id: number; name: string }) {
        await invalidateToolsetQueries(updatedToolset.id);
        toast.success(t("toast.update.success_title"), {
          description: t("toast.update.success_description_with_name", { name: updatedToolset.name }),
        });
        onConfirm?.();
      },
    },
  });

  const handleSubmit = (data: ToolsetEditFormValues) => {
    const payload = editFormValuesToPayload(data);
    updateMutation.mutate({ toolsetId: toolset.id, data: payload });
  };

  return (
    <FormShell<ToolsetEditFormValues> values={formValues} onSubmit={handleSubmit}>
      <NameField fieldName="name" fieldProps={{ label: t("form.name.label") }} />

      <ToolsetTypeSelectField />

      <CheckboxField fieldName="is_enabled" fieldProps={{ label: t("form.is_enabled.label") }} />

      <DynamicConfigFields />

      <ToolList />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? t("form.submit.saving") : t("form.submit.save")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
