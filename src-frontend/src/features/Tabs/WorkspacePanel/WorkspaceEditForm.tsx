import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { WorkspaceRead } from "@/api/generated/schemas";
import { invalidateWorkspaceQueries, useUpdateWorkspace } from "@/api/workspace";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import {
  DirectoryField,
  NameField,
  RichTextField,
} from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AgentMultiSelectField } from "./fields/AgentMultiSelectField";
import { ToolMultiSelectField } from "./fields/ToolMultiSelectField";
import {
  type WorkspaceEditFormValues,
  workspaceToEditFormValues,
} from "./form-types";

type WorkspaceEditFormProps = {
  workspace: WorkspaceRead;
  onConfirm?: () => void;
};

export function WorkspaceEditForm({
  workspace,
  onConfirm,
}: WorkspaceEditFormProps) {
  const { t } = useTranslation("tabs-workspace");
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const syncCurrentWorkspace = useWorkspaceStore((state) => state.syncCurrent);

  const formValues = useMemo(
    () => workspaceToEditFormValues(workspace),
    [workspace]
  );

  const updateMutation = useUpdateWorkspace({
    mutation: {
      async onSuccess(updatedWorkspace: { id: number; name: string }) {
        await invalidateWorkspaceQueries(updatedWorkspace.id);
        toast.success(t("toast.update.success_title"), {
          description: t("toast.update.success_description_with_name", { name: updatedWorkspace.name }),
        });
        onConfirm?.();

        if (updatedWorkspace.id === currentWorkspace?.id) {
          await syncCurrentWorkspace();
        }
      },
      onError(error: Error) {
        toast.error(t("toast.update.error_title"), {
          description: error.message || t("toast.update.error_description"),
        });
      },
    },
  });

  function handleSubmit(data: WorkspaceEditFormValues) {
    updateMutation.mutate({ workspaceId: workspace.id, data });
  }

  return (
    <FormShell<WorkspaceEditFormValues>
      values={formValues}
      onSubmit={handleSubmit}
      className="h-full"
    >
      <NameField
        fieldName="name"
        fieldProps={{ label: t("form.name.label") }}
        controlProps={{ placeholder: t("form.name.placeholder") }}
      />

      <DirectoryField
        fieldName="directory"
        fieldProps={{ label: t("form.directory.label") }}
      />

      <RichTextField
        fieldName="instruction"
        fieldProps={{ label: t("form.instruction.label"), className: "mt-2" }}
        minLength={0}
      />

      <AgentMultiSelectField />

      <ToolMultiSelectField />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? t("form.submit.saving") : t("form.submit.save")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
