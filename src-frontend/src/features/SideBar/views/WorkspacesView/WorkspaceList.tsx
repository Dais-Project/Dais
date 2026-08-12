import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { WorkspaceBrief } from "@/api/generated/schemas";
import {
  invalidateWorkspaceQueries,
  useDeleteWorkspace,
} from "@/api/workspace";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { WorkspaceSearchList } from "./WorkspaceSearchList";
import { WorkspaceViewList } from "./WorkspaceViewList";

type WorkspaceListProps = {
  searchQuery: string | null;
};

export function WorkspaceList({ searchQuery }: WorkspaceListProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const removeTabs = useTabsStore((state) => state.remove);
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrent);
  const isCurrentWorkspaceLoading = useWorkspaceStore(
    (state) => state.isLoading,
  );

  const deleteWorkspaceMutation = useDeleteWorkspace({
    mutation: {
      async onSuccess(_, variables) {
        removeTabs(
          (tab) =>
            tab.type === "workspace" &&
            (tab.metadata.mode === "edit" ||
              tab.metadata.mode === "edit-notes") &&
            tab.metadata.id === variables.workspaceId,
        );
        await invalidateWorkspaceQueries(variables.workspaceId);

        const { current: currentWorkspace, setCurrent: setCurrentWorkspace } =
          useWorkspaceStore.getState();
        if (variables.workspaceId === currentWorkspace?.id) {
          await setCurrentWorkspace(null);
        }

        toast.success(t("workspaces.toast.delete_success_title"), {
          description: t("workspaces.toast.delete_success_description"),
        });
      },
    },
  });
  const asyncConfirm = useAsyncConfirm<WorkspaceBrief>({
    async onConfirm(workspace) {
      await deleteWorkspaceMutation.mutateAsync({ workspaceId: workspace.id });
    },
  });

  const List = searchQuery !== null
    ? <WorkspaceSearchList
      searchQuery={searchQuery}
      disabled={isCurrentWorkspaceLoading}
      onSelect={setCurrentWorkspace}
      onDelete={asyncConfirm.trigger}
    />
    : <WorkspaceViewList
      currentWorkspace={currentWorkspace}
      disabled={isCurrentWorkspaceLoading}
      onSelect={setCurrentWorkspace}
      onDelete={asyncConfirm.trigger}
    />

  return (
    <>
      {List}
      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={t("workspaces.dialog.delete_description_with_name", {
          name: asyncConfirm.pendingData?.name ?? "",
        })}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
