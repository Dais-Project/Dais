import { useGetAgentSuspense } from "@/api/agent";
import { AgentCreateForm } from "@/features/Tabs/AgentPanel/AgentCreateForm";
import { AgentEditForm } from "@/features/Tabs/AgentPanel/AgentEditForm";
import type { AgentTabMetadata } from "@/types/tab";
import { useTabPanelActions } from "../components/TabPanelActions";
import { TabPanelFrame } from "../components/TabPanelFrame";
import type { TabPanelProps } from "../index";

function AgentCreatePanel() {
  const { close } = useTabPanelActions();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <AgentCreateForm onConfirm={close} />
    </div>
  );
}

function AgentEditPanel({ agentId }: { agentId: number }) {
  const { close } = useTabPanelActions();
  const { data: agent } = useGetAgentSuspense(agentId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <AgentEditForm agent={agent} onConfirm={close} />
    </div>
  );
}

export function AgentPanel({
  id,
  metadata,
}: TabPanelProps<AgentTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <TabPanelFrame tabId={id}>
        <AgentCreatePanel />
      </TabPanelFrame>
    );
  }

  return (
    <TabPanelFrame tabId={id}>
      <AgentEditPanel agentId={metadata.id} />
    </TabPanelFrame>
  );
}
