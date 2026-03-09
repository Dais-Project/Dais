import { useTranslation } from "react-i18next";
import { useGetProviderSuspense } from "@/api/provider";
import { FailedToLoad } from "@/components/custom/FailedToLoad";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProviderCreateForm } from "@/features/Tabs/ProviderPanel/ProviderCreateForm";
import { ProviderEditForm } from "@/features/Tabs/ProviderPanel/ProviderEditForm";
import { useTabsStore } from "@/stores/tabs-store";
import type { ProviderTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../TabPanelFrame";

function ProviderCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.remove);
  const handleComplete = () => removeTab(tabId);

  return <ProviderCreateForm onConfirm={handleComplete} />;
}

function ProviderEditPanel({
  tabId,
  providerId,
}: {
  tabId: string;
  providerId: number;
}) {
  const removeTab = useTabsStore((state) => state.remove);
  const { data: provider } = useGetProviderSuspense(providerId);
  const handleComplete = () => removeTab(tabId);

  return <ProviderEditForm provider={provider} onConfirm={handleComplete} />;
}

export function ProviderPanel({
  tabId,
  metadata,
}: TabPanelProps<ProviderTabMetadata>) {
  const { t } = useTranslation("tabs-provider");

  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <ProviderCreatePanel tabId={tabId} />
      </ScrollArea>
    );
  }

  return (
    <TabPanelFrame
      errorRender={({ resetErrorBoundary }) => (
        <div className="flex h-full items-center justify-center p-4">
          <FailedToLoad
            refetch={resetErrorBoundary}
            description={t("panel.error.load_description")}
          />
        </div>
      )}
    >
      <ProviderEditPanel tabId={tabId} providerId={metadata.id} />
    </TabPanelFrame>
  );
}
