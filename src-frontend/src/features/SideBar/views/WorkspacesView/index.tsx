import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FailedToLoad } from "@/components/custom/FailedToLoad";
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
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <FailedToLoad
                  refetch={resetErrorBoundary}
                  description="无法加载工作区列表，请稍后重试。"
                />
              )}
            >
              <Suspense fallback={<WorkspaceListSkeleton />}>
                <WorkspaceList />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </div>
  );
}
WorkspacesView.componentId = "workspaces";
