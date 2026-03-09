import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateWorkspaceQueries, useCreateWorkspace } from "@/api/workspace";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { DirectoryField, NameField, RichTextField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DEFAULT_WORKSPACE } from "@/constants/workspace";
import { AgentMultiSelectField } from "./fields/AgentMultiSelectField";
import { ToolMultiSelectField } from "./fields/ToolMultiSelectField";
import type { WorkspaceCreateFormValues } from "./form-types";

type WorkspaceCreateFormProps = {
  onConfirm?: () => void;
};

export function WorkspaceCreateForm({ onConfirm }: WorkspaceCreateFormProps) {
  const { t } = useTranslation("tabs-workspace");

  const createMutation = useCreateWorkspace({
    mutation: {
      async onSuccess(newWorkspace: { name: string }) {
        await invalidateWorkspaceQueries();
        toast.success(t("toast.create.success_title"), {
          description: t("toast.create.success_description_with_name", { name: newWorkspace.name }),
        });
        onConfirm?.();
      },
      onError(error: Error) {
        toast.error(t("toast.create.error_title"), {
          description: error.message || t("toast.create.error_description"),
        });
      },
    },
  });

  function handleSubmit(data: WorkspaceCreateFormValues) {
    createMutation.mutate({ data });
  }

  return (
    <FormShell<WorkspaceCreateFormValues> values={DEFAULT_WORKSPACE} onSubmit={handleSubmit} className="h-full">
      <NameField
        fieldName="name"
        fieldProps={{ label: t("form.name.label") }}
        controlProps={{ placeholder: t("form.name.placeholder") }}
      />

      <DirectoryField fieldName="directory" fieldProps={{ label: t("form.directory.label") }} />

      <RichTextField
        fieldName="instruction"
        fieldProps={{ label: t("form.instruction.label"), className: "mt-2" }}
        minLength={0}
      />

      <AgentMultiSelectField />

      <ToolMultiSelectField />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
