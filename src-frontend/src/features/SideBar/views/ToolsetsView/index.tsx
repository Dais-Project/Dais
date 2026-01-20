import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FailedToLoad } from "@/components/FailedToLoad";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import {
  SideBarHeader,
  SideBarHeaderAction,
} from "../../components/SideBarHeader";
import { ToolsetList } from "./ToolsetList";
import { ToolsetListSkeleton } from "./ToolsetListSkeleton";

function openToolsetCreateTab() {
  const addTab = useTabsStore.getState().addTab;
  addTab({
    id: tabIdFactory(),
    type: "toolset",
    title: "Connect to MCP server",
    metadata: { mode: "create" },
  });
}

export function ToolsetsView() {
  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title="Toolsets">
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip="Connect to MCP server"
          onClick={openToolsetCreateTab}
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
                  description="无法加载 Toolset 列表，请稍后重试。"
                />
              )}
            >
              <Suspense fallback={<ToolsetListSkeleton />}>
                <ToolsetList />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </div>
  );
}
ToolsetsView.componentId = "toolsets";
