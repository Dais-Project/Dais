import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TABS_WORKSPACE_NAMESPACE } from "@/i18n/resources";
import type { WorkspaceRead } from "@/api/generated/schemas";
import { invalidateWorkspaceQueries, useUpdateWorkspace } from "@/api/workspace";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { WorkspaceNoteField } from "./fields/WorkspaceNoteField";
import {
  type WorkspaceNotesEditFormValues,
  workspaceToNotesEditFormValues,
  notesEditFormValuesToPayload,
} from "./form-types";

type WorkspaceNotesEditFormProps = {
  workspace: WorkspaceRead;
};

export function WorkspaceNotesEditForm({ workspace }: WorkspaceNotesEditFormProps) {
  const { t } = useTranslation(TABS_WORKSPACE_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const syncCurrentWorkspace = useWorkspaceStore((state) => state.syncCurrent);

  const formValues = useMemo(
    () => workspaceToNotesEditFormValues(workspace),
    [workspace.notes]
  );

  const updateMutation = useUpdateWorkspace({
    mutation: {
      async onSuccess(updatedWorkspace: { id: number; name: string }) {
        await invalidateWorkspaceQueries(updatedWorkspace.id);
        toast.success(t("toast.update.success_title"), {
          description: t("toast.update.success_description_with_name", { name: updatedWorkspace.name }),
        });

        if (updatedWorkspace.id === currentWorkspace?.id) {
          await syncCurrentWorkspace();
        }
      },
    },
  });

  const handleSubmit = (data: WorkspaceNotesEditFormValues) => {
    const payload = notesEditFormValuesToPayload(data);
    updateMutation.mutate({ workspaceId: workspace.id, data: payload });
  };

  return (
    <FormShell<WorkspaceNotesEditFormValues>
      values={formValues}
      onSubmit={handleSubmit}
      className="h-full"
    >
      <WorkspaceNoteField />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? t("form.submit.saving") : t("form.submit.save")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
