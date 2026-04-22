import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateWorkspaceQueries, useCreateWorkspace } from "@/api/workspace";
import { TABS_WORKSPACE_NAMESPACE } from "@/i18n/resources";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { DirectoryField, NameField, RichTextField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DEFAULT_WORKSPACE } from "@/constants/workspace";
import { AgentMultiSelectField } from "./fields/AgentMultiSelectField";
import { SkillMultiSelectField } from "./fields/SkillMultiSelectField";
import { ToolMultiSelectField } from "./fields/ToolMultiSelectField";
import { WorkspaceNoteField } from "./fields/WorkspaceNoteField";
import { createFormValuesToPayload, type WorkspaceCreateFormValues } from "./form-types";

type WorkspaceCreateFormProps = {
  onConfirm?: () => void;
};

export function WorkspaceCreateForm({ onConfirm }: WorkspaceCreateFormProps) {
  const { t } = useTranslation(TABS_WORKSPACE_NAMESPACE);

  const createMutation = useCreateWorkspace({
    mutation: {
      async onSuccess(newWorkspace: { name: string }) {
        await invalidateWorkspaceQueries();
        toast.success(t("toast.create.success_title"), {
          description: t("toast.create.success_description_with_name", { name: newWorkspace.name }),
        });
        onConfirm?.();
      },
    },
  });

  const handleSubmit = (data: WorkspaceCreateFormValues) => {
    createMutation.mutate({ data: createFormValuesToPayload(data) });
  };

  return (
    <FormShell<WorkspaceCreateFormValues> values={DEFAULT_WORKSPACE} onSubmit={handleSubmit} className="h-full">
      <NameField
        fieldName="name"
        fieldProps={{ label: t("form.name.label") }}
        controlProps={{ placeholder: t("form.name.placeholder") }}
      />

      <DirectoryField fieldName="directory" />

      <RichTextField
        fieldName="instruction"
        fieldProps={{ label: t("form.instruction.label"), className: "mt-2" }}
        controlProps={{ className: "mt-2" }}
        minLength={0}
      />

      <WorkspaceNoteField />

      <AgentMultiSelectField />

      <ToolMultiSelectField />

      <SkillMultiSelectField />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
