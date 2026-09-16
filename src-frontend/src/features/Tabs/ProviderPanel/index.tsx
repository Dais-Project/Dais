import { useGetProviderSuspense } from "@/api/provider";
import { ProviderCreateForm } from "@/features/Tabs/ProviderPanel/ProviderCreateForm";
import { ProviderEditForm } from "@/features/Tabs/ProviderPanel/ProviderEditForm";
import type { ProviderTabMetadata } from "@/types/tab";
import { useTabPanelActions } from "../components/TabPanelActions";
import { TabPanelFrame } from "../components/TabPanelFrame";
import type { TabPanelProps } from "../index";

function ProviderCreatePanel() {
  const { close } = useTabPanelActions();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ProviderCreateForm onConfirm={close} />
    </div>
  );
}

function ProviderEditPanel({ providerId }: { providerId: number }) {
  const { close } = useTabPanelActions();
  const { data: provider } = useGetProviderSuspense(providerId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ProviderEditForm provider={provider} onConfirm={close} />
    </div>
  );
}

export function ProviderPanel({
  id,
  metadata,
}: TabPanelProps<ProviderTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <TabPanelFrame tabId={id}>
        <ProviderCreatePanel />
      </TabPanelFrame>
    );
  }

  return (
    <TabPanelFrame tabId={id}>
      <ProviderEditPanel providerId={metadata.id} />
    </TabPanelFrame>
  );
}
