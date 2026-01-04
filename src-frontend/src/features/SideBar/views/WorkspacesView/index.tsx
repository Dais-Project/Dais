import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FailedToLoad } from "@/components/FailedToLoad";
import { Button } from "@/components/ui/button";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";
import { SideBarHeader } from "../../SideBar";
import { WorkspaceList } from "./WorkspaceList";
import { WorkspaceListSkeleton } from "./WorkspaceListSkeleton";

function createWorkspaceCreateTab(): Tab {
  return {
    id: tabIdFactory(),
    type: "workspace",
    title: "创建工作区",
    icon: "folder-plus",
    metadata: { mode: "create" },
  };
}

export function WorkspacesView() {
  const { addTab } = useTabsStore();

  const handleCreateWorkspace = () => {
    const newTab = createWorkspaceCreateTab();
    addTab(newTab);
  };

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader
        title="Workspaces"
        actions={[
          {
            button: (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handleCreateWorkspace}
              >
                <PlusIcon className="size-4" />
              </Button>
            ),
            tooltip: "Create new workspace",
          },
        ]}
      />
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
