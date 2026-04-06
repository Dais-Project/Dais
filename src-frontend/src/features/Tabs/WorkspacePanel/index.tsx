import { useGetWorkspaceSuspense } from "@/api/workspace";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTabsStore } from "@/stores/tabs-store";
import type { WorkspaceTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../components/TabPanelFrame";
import { WorkspaceCreateForm } from "./WorkspaceCreateForm";
import { WorkspaceEditForm } from "./WorkspaceEditForm";

function WorkspaceCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.remove);
  const handleComplete = () => removeTab(tabId);

  return <WorkspaceCreateForm onConfirm={handleComplete} />;
}

function WorkspaceEditPanel({
  tabId,
  workspaceId,
}: {
  tabId: string;
  workspaceId: number;
}) {
  const removeTab = useTabsStore((state) => state.remove);
  const { data: workspace } = useGetWorkspaceSuspense(workspaceId);
  const handleComplete = () => removeTab(tabId);

  return <WorkspaceEditForm workspace={workspace} onConfirm={handleComplete} />;
}

export function WorkspacePanel({
  id,
  metadata,
}: TabPanelProps<WorkspaceTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <WorkspaceCreatePanel tabId={id} />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    );
  }

  return (
    <TabPanelFrame>
      <WorkspaceEditPanel tabId={id} workspaceId={metadata.id} />
    </TabPanelFrame>
  );
}
