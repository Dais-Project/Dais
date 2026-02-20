import { useGetAgentSuspense } from "@/api/agent";
import { FailedToLoad } from "@/components/custom/FailedToLoad";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AgentCreateForm } from "@/features/Tabs/AgentPanel/AgentCreateForm";
import { AgentEditForm } from "@/features/Tabs/AgentPanel/AgentEditForm";
import { useTabsStore } from "@/stores/tabs-store";
import type { AgentTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../TabPanelFrame";

function AgentCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.remove);

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <AgentCreateForm onConfirm={handleComplete} />;
}

function AgentEditPanel({
  tabId,
  agentId,
}: {
  tabId: string;
  agentId: number;
}) {
  const removeTab = useTabsStore((state) => state.remove);

  const { data: agent } = useGetAgentSuspense(agentId);

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <AgentEditForm agent={agent} onConfirm={handleComplete} />;
}

export function AgentPanel({
  tabId,
  metadata,
}: TabPanelProps<AgentTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <AgentCreatePanel tabId={tabId} />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    );
  }

  return (
    <TabPanelFrame
      errorRender={({ resetErrorBoundary }) => (
        <div className="flex h-full items-center justify-center p-4">
          <FailedToLoad
            refetch={resetErrorBoundary}
            description="无法加载 Agent 信息，请稍后重试。"
          />
        </div>
      )}
    >
      <AgentEditPanel tabId={tabId} agentId={metadata.id} />
    </TabPanelFrame>
  );
}
