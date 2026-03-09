import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("tabs-agent");
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
        <FailedToLoad
          refetch={resetErrorBoundary}
          description={t("panel.error.load_description")}
        />
      )}
    >
      <AgentEditPanel tabId={tabId} agentId={metadata.id} />
    </TabPanelFrame>
  );
}
