import { useGetWorkspaceSuspense } from "@/api/workspace";
import { FailedToLoad } from "@/components/FailedToLoad";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DEFAULT_WORKSPACE } from "@/constants/workspace";
import { WorkspaceEdit } from "@/features/Tabs/WorkspacePanel/WorkspaceEdit";
import { useTabsStore } from "@/stores/tabs-store";
import type { WorkspaceTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../TabPanelFrame";

function WorkspaceCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.removeTab);

  const handleComplete = () => {
    removeTab(tabId);
  };

  return (
    <WorkspaceEdit workspace={DEFAULT_WORKSPACE} onConfirm={handleComplete} />
  );
}

function WorkspaceEditPanel({
  tabId,
  workspaceId,
}: {
  tabId: string;
  workspaceId: number;
}) {
  const removeTab = useTabsStore((state) => state.removeTab);
  const { data: workspace } = useGetWorkspaceSuspense(workspaceId);
  const handleComplete = () => removeTab(tabId);

  return <WorkspaceEdit workspace={workspace} onConfirm={handleComplete} />;
}

export function WorkspacePanel({
  tabId,
  metadata,
}: TabPanelProps<WorkspaceTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <WorkspaceCreatePanel tabId={tabId} />
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
            description="无法加载工作区信息，请稍后重试。"
          />
        </div>
      )}
    >
      <WorkspaceEditPanel tabId={tabId} workspaceId={metadata.id} />
    </TabPanelFrame>
  );
}
