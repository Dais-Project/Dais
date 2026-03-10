import { CircleIcon, FolderIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { WorkspaceBrief } from "@/api/generated/schemas";
import {
  invalidateWorkspaceQueries,
  useDeleteWorkspace,
  useGetWorkspacesSuspenseInfinite,
} from "@/api/workspace";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { i18n } from "@/i18n";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { Tab, WorkspaceTabMetadata } from "@/types/tab";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";

function createWorkspaceEditTab(workspaceId: number, workspaceName: string): Tab {
  return {
    id: tabIdFactory(),
    type: "workspace",
    title: i18n.t("workspaces.tab.edit_title_with_name", { ns: SIDEBAR_NAMESPACE, name: workspaceName }),
    icon: "folder-cog",
    metadata: { mode: "edit", id: workspaceId },
  };
}

type OpenWorkspaceEditTabParams = {
  tabs: Tab[];
  workspaceId: number;
  workspaceName: string;
  addTab: (tab: Tab) => void;
  setActiveTab: (tabId: string) => void;
};

function openWorkspaceEditTab({ tabs, workspaceId, workspaceName, addTab, setActiveTab }: OpenWorkspaceEditTabParams) {
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "workspace" &&
      tab.metadata.mode === "edit" &&
      (tab.metadata as WorkspaceTabMetadata & { mode: "edit" }).id === workspaceId
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createWorkspaceEditTab(workspaceId, workspaceName);
    addTab(newTab);
  }
}

type WorkspaceItemProps = {
  workspace: WorkspaceBrief;
  disabled: boolean;
  isSelected: boolean;
  onSelect: (workspaceId: number) => void;
  onDelete: (workspace: WorkspaceBrief) => void;
};

function WorkspaceItem({ workspace, disabled, isSelected, onSelect, onDelete }: WorkspaceItemProps) {
  const { t } = useTranslation("sidebar");
  const tabs = useTabsStore((state) => state.tabs);
  const addTab = useTabsStore((state) => state.add);
  const setActiveTab = useTabsStore((state) => state.setActive);

  const handleSelect = (e: React.MouseEvent) => {
    if (disabled) {
      return;
    }
    onSelect(workspace.id);
    e.stopPropagation();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openWorkspaceEditTab({
      tabs,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      addTab,
      setActiveTab,
    });
  };

  return (
    <ActionableItem>
      <ActionableItemTrigger>
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
          <span>设为当前工作区</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon />
          <span>{t("workspaces.menu.edit")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem variant="destructive" onClick={() => onDelete(workspace)}>
          <TrashIcon />
          <span>{t("workspaces.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function WorkspaceList() {
  const { t } = useTranslation("sidebar");
  const removeTabs = useTabsStore((state) => state.remove);
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrent);
  const isCurrentWorkspaceLoading = useWorkspaceStore((state) => state.isLoading);

  const asyncConfirm = useAsyncConfirm<WorkspaceBrief>({
    async onConfirm(workspace) {
      await deleteWorkspaceMutation.mutateAsync({ workspaceId: workspace.id });
      await invalidateWorkspaceQueries(workspace.id);

      removeTabs((tab) => (tab.type === "workspace" &&
                           tab.metadata.mode === "edit" &&
                           tab.metadata.id === workspace.id));

      // clear current workspace if deleted
      if (workspace.id === currentWorkspace?.id) {
        await setCurrentWorkspace(null);
      }

      toast.success(t("workspaces.toast.delete_success_title"), {
        description: t("workspaces.toast.delete_success_description"),
      });
    },
    onError(error: Error) {
      toast.error(t("workspaces.toast.delete_error_title"), {
        description: error.message || t("workspaces.toast.delete_error_description"),
      });
    },
  });

  const query = useGetWorkspacesSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });
  const deleteWorkspaceMutation = useDeleteWorkspace();

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
      <ScrollArea className="flex-1">
        <InfiniteScroll
          query={query}
          selectItems={(page) => page.items}
          itemRender={(workspace) => (
            <WorkspaceItem
              key={workspace.id}
              workspace={workspace}
              disabled={isCurrentWorkspaceLoading}
              isSelected={workspace.id === currentWorkspace?.id}
              onSelect={setCurrentWorkspace}
              onDelete={asyncConfirm.trigger}
            />
          )}
        />
      </ScrollArea>
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
