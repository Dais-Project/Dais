import { PlusIcon } from "lucide-react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import {
  SideBarHeader,
  SideBarHeaderAction,
} from "../../components/SideBarHeader";
import { WorkspaceList } from "./WorkspaceList";
import { WorkspaceListSkeleton } from "./WorkspaceListSkeleton";

function openWorkspaceCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    id: tabIdFactory(),
    type: "workspace",
    title: "创建工作区",
    icon: "folder-plus",
    metadata: { mode: "create" },
  });
}

export function WorkspacesView() {
  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title="工作区">
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip="Create new workspace"
          onClick={openWorkspaceCreateTab}
        />
      </SideBarHeader>
      <div className="flex-1">
        <AsyncBoundary
          skeleton={<WorkspaceListSkeleton />}
          errorDescription="无法加载工作区列表，请稍后重试。"
        >
          <WorkspaceList />
        </AsyncBoundary>
      </div>
    </div>
  );
}
WorkspacesView.componentId = "workspaces";
