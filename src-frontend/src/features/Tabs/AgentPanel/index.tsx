import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchAgentById } from "@/api/agent";
import { FailedToLoad } from "@/components/FailedToLoad";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DEFAULT_AGENT } from "@/constants/agent";
import { AgentEdit } from "@/features/Tabs/AgentPanel/AgentEdit";
import { useTabsStore } from "@/stores/tabs-store";
import type { AgentTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../TabPanelFrame";

function AgentCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.removeTab);

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <AgentEdit agent={DEFAULT_AGENT} onConfirm={handleComplete} />;
}

function AgentEditPanel({
  tabId,
  agentId,
}: {
  tabId: string;
  agentId: number;
}) {
  const removeTab = useTabsStore((state) => state.removeTab);

  const { data: agent } = useSuspenseQuery({
    queryKey: ["agent", agentId],
    queryFn: async () => await fetchAgentById(agentId),
  });

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <AgentEdit agent={agent} onConfirm={handleComplete} />;
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
      fallbackChildren={
        <div className="flex h-full items-center justify-center p-4">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      }
      fallbackRender={({ resetErrorBoundary }) => (
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
