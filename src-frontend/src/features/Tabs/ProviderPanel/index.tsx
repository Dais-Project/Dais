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
  const removeTab = useTabsStore((state) => state.removeTab);
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
  const removeTab = useTabsStore((state) => state.removeTab);
  const { data: provider } = useGetProviderSuspense(providerId);
  const handleComplete = () => removeTab(tabId);

  return <ProviderEditForm provider={provider} onConfirm={handleComplete} />;
}

export function ProviderPanel({
  tabId,
  metadata,
}: TabPanelProps<ProviderTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <ProviderCreatePanel tabId={tabId} />
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
            description="无法加载服务提供商信息，请稍后重试。"
          />
        </div>
      )}
    >
      <ProviderEditPanel tabId={tabId} providerId={metadata.id} />
    </TabPanelFrame>
  );
}
