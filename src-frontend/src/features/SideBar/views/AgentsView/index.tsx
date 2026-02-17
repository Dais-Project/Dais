import { PlusIcon } from "lucide-react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import {
  SideBarHeader,
  SideBarHeaderAction,
} from "../../components/SideBarHeader";
import { AgentList } from "./AgentList";
import { AgentListSkeleton } from "./AgentListSkeleton";

function openAgentCreateTab() {
  const addTab = useTabsStore.getState().add;
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
        <AsyncBoundary
          skeleton={<AgentListSkeleton />}
          errorDescription="无法加载 Agent 列表，请稍后重试。"
        >
          <AgentList />
        </AsyncBoundary>
      </div>
    </div>
  );
}
AgentsView.componentId = "agents";
