import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { FolderIcon, PencilIcon, TrashIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { deleteWorkspace, fetchWorkspaces } from "@/api/workspace";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { Tab, WorkspaceTabMetadata } from "@/types/tab";
import type { WorkspaceRead } from "@/types/workspace";

function createWorkspaceEditTab(
  workspaceId: number,
  workspaceName: string
): Tab {
  return {
    id: tabIdFactory(),
    type: "workspace",
    title: `编辑：${workspaceName}`,
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

function openWorkspaceEditTab({
  tabs,
  workspaceId,
  workspaceName,
  addTab,
  setActiveTab,
}: OpenWorkspaceEditTabParams) {
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "workspace" &&
      tab.metadata.mode === "edit" &&
      (tab.metadata as WorkspaceTabMetadata & { mode: "edit" }).id ===
        workspaceId
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createWorkspaceEditTab(workspaceId, workspaceName);
    addTab(newTab);
  }
}

type WorkspaceItemProps = {
  workspace: WorkspaceRead;
  disabled: boolean;
  isSelected: boolean;
  onSelect: (workspaceId: number) => void;
  onDelete: (workspace: WorkspaceRead) => void;
};

function WorkspaceItem({
  workspace,
  disabled,
  isSelected,
  onSelect,
  onDelete,
}: WorkspaceItemProps) {
  const { tabs, addTab, setActiveTab } = useTabsStore();

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
          className={
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }
          onClick={handleSelect}
          aria-disabled={disabled}
        >
          <FolderIcon
            fill={isSelected ? "currentColor" : "none"}
            className="size-4"
          />
        </ActionableItemIcon>
        <ActionableItemInfo
          title={workspace.name}
          description={workspace.directory}
        />
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon className="mr-2 size-4" />
          <span>编辑工作区</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem
          className="text-destructive hover:text-destructive!"
          onClick={() => onDelete(workspace)}
        >
          <TrashIcon className="mr-2 size-4 text-destructive" />
          <span>删除工作区</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

const MemoizedWorkspaceItem = React.memo(
  WorkspaceItem,
  (prev, next) =>
    prev.workspace.id === next.workspace.id &&
    prev.workspace.name === next.workspace.name &&
    prev.workspace.directory === next.workspace.directory
);

export function WorkspaceList() {
  const queryClient = useQueryClient();
  const { tabs, removeTab } = useTabsStore();
  const {
    currentWorkspace,
    setCurrentWorkspace,
    isLoading: isCurrentWorkspaceLoading,
  } = useWorkspaceStore();

  const asyncConfirm = useAsyncConfirm<WorkspaceRead>({
    onConfirm: async (workspace) => {
      await deleteWorkspaceMutation.mutateAsync(workspace.id);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });

      const tabsToRemove = tabs.filter(
        (tab) =>
          tab.type === "workspace" &&
          tab.metadata.mode === "edit" &&
          tab.metadata.id === workspace.id
      );

      for (const tab of tabsToRemove) {
        removeTab(tab.id);
      }

      // clear current workspace if deleted
      if (workspace.id === currentWorkspace?.id) {
        await setCurrentWorkspace(null);
      }

      toast.success("删除成功", {
        description: "已成功删除工作区。",
      });
    },
    onError: (error: Error) => {
      toast.error("删除失败", {
        description: error.message || "删除工作区时发生错误，请稍后重试。",
      });
    },
  });

  const { data } = useSuspenseQuery({
    queryKey: ["workspaces"],
    queryFn: async () => await fetchWorkspaces(1, 20),
  });

  const deleteWorkspaceMutation = useMutation({ mutationFn: deleteWorkspace });

  if (data?.items.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>暂无工作区</EmptyTitle>
          <EmptyDescription>您还没有创建任何工作区。</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1">
        {data?.items.map((workspace) => (
          <MemoizedWorkspaceItem
            key={workspace.id}
            workspace={workspace}
            disabled={isCurrentWorkspaceLoading}
            isSelected={workspace.id === currentWorkspace?.id}
            onSelect={setCurrentWorkspace}
            onDelete={asyncConfirm.trigger}
          />
        ))}
      </ScrollArea>
      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={`确定要删除工作区 "${asyncConfirm.pendingData?.name}" 吗？此操作无法撤销。`}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
