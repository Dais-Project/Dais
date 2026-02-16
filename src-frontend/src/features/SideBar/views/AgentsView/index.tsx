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
import { AgentList } from "./AgentList";
import { AgentListSkeleton } from "./AgentListSkeleton";

function openAgentCreateTab() {
  const addTab = useTabsStore.getState().addTab;
  addTab({
    id: tabIdFactory(),
    type: "agent",
    title: "创建 Agent",
    icon: "bot",
    metadata: { mode: "create" },
  });
}

export function AgentsView() {
  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title="Agents">
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip="Create new agent"
          onClick={openAgentCreateTab}
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
                  description="无法加载 Agent 列表，请稍后重试。"
                />
              )}
            >
              <Suspense fallback={<AgentListSkeleton />}>
                <AgentList />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </div>
  );
}
AgentsView.componentId = "agents";
