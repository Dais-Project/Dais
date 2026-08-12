import {
  CircleIcon,
  FolderOpenIcon,
  NotebookPenIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import type { WorkspaceBrief } from "@/api/generated/schemas";
import { openWorkspace } from "@/api/workspace";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { isTauri } from "@/lib/tauri";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";
import { openTaskCreateTab } from "../TasksView/shared";
import type { WorkspaceItemVariant } from "./types";
import { WorkspaceIcon } from "./WorkspaceIcon";

function createWorkspaceEditTab(
  workspaceId: number,
  workspaceName: string,
): Tab {
  return {
    type: "workspace",
    title: i18n.t("workspaces.tab.edit_title_with_name", {
      ns: SIDEBAR_NAMESPACE,
      name: workspaceName,
    }),
    icon: "folder-cog",
    metadata: { mode: "edit", id: workspaceId },
  };
}

function createWorkspaceNotesEditTab(
  workspaceId: number,
  workspaceName: string,
): Tab {
  return {
    type: "workspace",
    title: i18n.t("workspaces.tab.edit_notes_title_with_name", {
      ns: SIDEBAR_NAMESPACE,
      name: workspaceName,
    }),
    icon: "notebook-pen",
    metadata: { mode: "edit-notes", id: workspaceId },
  };
}

type OpenWorkspaceEditTabParams = {
  workspaceId: number;
  workspaceName: string;
};

function openWorkspaceEditTab({
  workspaceId,
  workspaceName,
}: OpenWorkspaceEditTabParams) {
  const {
    tabs,
    add: addTab,
    setActive: setActiveTab,
  } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "workspace" &&
      tab.metadata.mode === "edit" &&
      tab.metadata.id === workspaceId,
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createWorkspaceEditTab(workspaceId, workspaceName);
    addTab(newTab);
  }
}

function openWorkspaceNotesEditTab({
  workspaceId,
  workspaceName,
}: OpenWorkspaceEditTabParams) {
  const {
    tabs,
    add: addTab,
    setActive: setActiveTab,
  } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "workspace" &&
      tab.metadata.mode === "edit-notes" &&
      tab.metadata.id === workspaceId,
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
  index?: number;
  variant?: WorkspaceItemVariant;
  ref?: React.Ref<HTMLDivElement>;
  onSelect?: (workspaceId: number) => void;
  onDelete?: (workspace: WorkspaceBrief) => void;
};

export function WorkspaceItem({
  workspace,
  disabled,
  index,
  variant = "default",
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
          className={
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }
          onClick={handleSelect}
          aria-disabled={disabled}
        >
          <WorkspaceIcon variant={variant} />
        </ActionableItemIcon>
        <ActionableItemInfo
          title={workspace.name}
          description={workspace.directory}
        />
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem
          onClick={handleSelect}
          disabled={variant === "current"}
        >
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
        <ActionableItemMenuItem
          variant="destructive"
          onClick={() => onDelete?.(workspace)}
        >
          <TrashIcon />
          <span>{t("workspaces.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}
