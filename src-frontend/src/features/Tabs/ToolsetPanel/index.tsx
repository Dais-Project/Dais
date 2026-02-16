import { useGetToolsetSuspense } from "@/api/toolset";
import { FailedToLoad } from "@/components/custom/FailedToLoad";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToolsetEditForm } from "@/features/Tabs/ToolsetPanel/ToolsetEditForm";
import { useTabsStore } from "@/stores/tabs-store";
import type { ToolsetTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../TabPanelFrame";
import { ToolsetCreateForm } from "./ToolsetCreateForm";

function ToolsetCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.removeTab);

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <ToolsetCreateForm onConfirm={handleComplete} />;
}

function ToolsetEditPanel({
  tabId,
  toolsetId,
}: {
  tabId: string;
  toolsetId: number;
}) {
  const removeTab = useTabsStore((state) => state.removeTab);
  const { data: toolset } = useGetToolsetSuspense(toolsetId);
  const handleComplete = () => removeTab(tabId);

  return <ToolsetEditForm toolset={toolset} onConfirm={handleComplete} />;
}

export function ToolsetPanel({
  tabId,
  metadata,
}: TabPanelProps<ToolsetTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <ToolsetCreatePanel tabId={tabId} />
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
            description="无法加载 Toolset 信息，请稍后重试。"
          />
        </div>
      )}
    >
      <ToolsetEditPanel tabId={tabId} toolsetId={metadata.id} />
    </TabPanelFrame>
  );
}
