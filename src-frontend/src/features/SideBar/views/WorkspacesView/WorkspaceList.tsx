import { CircleIcon, FolderIcon, FolderOpenIcon, NotebookPenIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { WorkspaceBrief } from "@/api/generated/schemas";
import {
  invalidateWorkspaceQueries,
  openWorkspace,
  useDeleteWorkspace,
  useGetWorkspacesSuspenseInfinite,
} from "@/api/workspace";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE, TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { isTauri } from "@/lib/tauri";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { Tab } from "@/types/tab";

function createWorkspaceEditTab(workspaceId: number, workspaceName: string): Tab {
  return {
    type: "workspace",
    title: i18n.t("workspaces.tab.edit_title_with_name", { ns: SIDEBAR_NAMESPACE, name: workspaceName }),
    icon: "folder-cog",
    metadata: { mode: "edit", id: workspaceId },
  };
}

function createWorkspaceNotesEditTab(workspaceId: number, workspaceName: string): Tab {
  return {
    type: "workspace",
    title: i18n.t("workspaces.tab.edit_notes_title_with_name", { ns: SIDEBAR_NAMESPACE, name: workspaceName }),
    icon: "notebook-pen",
    metadata: { mode: "edit-notes", id: workspaceId },
  };
}

function openTaskCreateTab(workspaceId: number) {
  const addTab = useTabsStore.getState().add;
  addTab({
    title: i18n.t("tab.default_title", { ns: TABS_TASK_NAMESPACE }),
    type: "task",
    metadata: {
      isDraft: true,
      workspace_id: workspaceId,
    },
  });
}

type OpenWorkspaceEditTabParams = {
  workspaceId: number;
  workspaceName: string;
};

function openWorkspaceEditTab({ workspaceId, workspaceName }: OpenWorkspaceEditTabParams) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "workspace" &&
      tab.metadata.mode === "edit" &&
      tab.metadata.id === workspaceId
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createWorkspaceEditTab(workspaceId, workspaceName);
    addTab(newTab);
  }
}

function openWorkspaceNotesEditTab({ workspaceId, workspaceName }: OpenWorkspaceEditTabParams) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "workspace" &&
      tab.metadata.mode === "edit-notes" &&
      tab.metadata.id === workspaceId
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createWorkspaceNotesEditTab(workspaceId, workspaceName);
    addTab(newTab);
  }
}

type WorkspaceItemProps = {
  workspace: WorkspaceBrief;
  disabled: boolean;
  isSelected: boolean;
  index: number;
  ref?: React.Ref<HTMLDivElement>;
  onSelect?: (workspaceId: number) => void;
  onDelete?: (workspace: WorkspaceBrief) => void;
};

function WorkspaceItem({
  workspace,
  disabled,
  isSelected,
  index,
  ref,
  onSelect,
  onDelete,
}: WorkspaceItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  const handleSelect = (e: React.MouseEvent) => {
    if (disabled) {
      return;
    }
    onSelect?.(workspace.id);
    e.stopPropagation();
  };

  const handleCreateTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    openTaskCreateTab(workspace.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openWorkspaceEditTab({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    });
  };

  const handleEditNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    openWorkspaceNotesEditTab({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    });
  };

  const handleOpenInFileManager = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTauri) {
      openWorkspace(workspace.id);
    }
  };

  return (
    <ActionableItem>
      <ActionableItemTrigger ref={ref} data-index={index}>
        <ActionableItemIcon
          role="button"
          className={disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          onClick={handleSelect}
          aria-disabled={disabled}
        >
          <FolderIcon fill={isSelected ? "currentColor" : "none"} className="size-4" />
        </ActionableItemIcon>
        <ActionableItemInfo title={workspace.name} description={workspace.directory} />
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleSelect} disabled={isSelected}>
          <CircleIcon />
          <span>{t("workspaces.menu.select")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem onClick={handleCreateTask}>
          <PlusIcon />
          <span>{t("workspaces.menu.create_task")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon />
          <span>{t("workspaces.menu.edit")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem onClick={handleEditNotes}>
          <NotebookPenIcon />
          <span>{t("workspaces.menu.edit_notes")}</span>
        </ActionableItemMenuItem>
        {isTauri && (
          <ActionableItemMenuItem onClick={handleOpenInFileManager}>
            <FolderOpenIcon />
            <span>{t("workspaces.menu.open_in_file_manager")}</span>
          </ActionableItemMenuItem>
        )}
        <ActionableItemMenuItem variant="destructive" onClick={() => onDelete?.(workspace)}>
          <TrashIcon />
          <span>{t("workspaces.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function WorkspaceList() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const removeTabs = useTabsStore((state) => state.remove);
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrent);
  const isCurrentWorkspaceLoading = useWorkspaceStore((state) => state.isLoading);

  const query = useGetWorkspacesSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const deleteWorkspaceMutation = useDeleteWorkspace({
    mutation: {
      async onSuccess(_, variables) {
        removeTabs((tab) => (tab.type === "workspace" &&
          (tab.metadata.mode === "edit" || tab.metadata.mode === "edit-notes") &&
          tab.metadata.id === variables.workspaceId));
        await invalidateWorkspaceQueries(variables.workspaceId);

        // clear current workspace if deleted
        const { current: currentWorkspace, setCurrent: setCurrentWorkspace } = useWorkspaceStore.getState();
        if (variables.workspaceId === currentWorkspace?.id) {
          await setCurrentWorkspace(null);
        }

        toast.success(t("workspaces.toast.delete_success_title"), {
          description: t("workspaces.toast.delete_success_description"),
        });
      }
    }
  });
  const asyncConfirm = useAsyncConfirm<WorkspaceBrief>({
    async onConfirm(workspace) {
      await deleteWorkspaceMutation.mutateAsync({ workspaceId: workspace.id });
    }
  });

  if (query.data.pages.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>{t("workspaces.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("workspaces.empty.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <InfiniteVirtualScroll
        query={query}
        className="limit-width"
        selectItems={(page) => page.items}
        getItemKey={(item) => item.id}
        itemHeight={69}
        overscan={3}
        itemRender={({ item, key, index, ref }) => (
          <WorkspaceItem
            key={key}
            workspace={item}
            ref={ref}
            index={index}
            disabled={isCurrentWorkspaceLoading}
            isSelected={item.id === currentWorkspace?.id}
            onSelect={setCurrentWorkspace}
            onDelete={asyncConfirm.trigger}
          />
        )}
      />
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
