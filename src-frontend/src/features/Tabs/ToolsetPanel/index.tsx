import { useGetToolsetSuspense } from "@/api/toolset";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToolsetEditForm } from "@/features/Tabs/ToolsetPanel/ToolsetEditForm";
import { useTabsStore } from "@/stores/tabs-store";
import type { ToolsetTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../TabPanelFrame";
import { ToolsetCreateForm } from "./ToolsetCreateForm";

function ToolsetCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.remove);

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
  const removeTab = useTabsStore((state) => state.remove);
  const { data: toolset } = useGetToolsetSuspense(toolsetId);
  const handleComplete = () => removeTab(tabId);

  return <ToolsetEditForm toolset={toolset} onConfirm={handleComplete} />;
}

export function ToolsetPanel({
  id,
  metadata,
}: TabPanelProps<ToolsetTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <ToolsetCreatePanel tabId={id} />
      </ScrollArea>
    );
  }

  return (
    <TabPanelFrame>
      <ToolsetEditPanel tabId={id} toolsetId={metadata.id} />
    </TabPanelFrame>
  );
}
