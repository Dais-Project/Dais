import { useGetWorkspaceSuspense } from "@/api/workspace";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTabsStore } from "@/stores/tabs-store";
import type { WorkspaceTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../components/TabPanelFrame";
import { WorkspaceCreateForm } from "./WorkspaceCreateForm";
import { WorkspaceEditForm } from "./WorkspaceEditForm";
import { WorkspaceNotesEditForm } from "./WorkspaceNotesEditForm";

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

function WorkspaceNotesEditPanel({ workspaceId }: { workspaceId: number }) {
  const { data: workspace } = useGetWorkspaceSuspense(workspaceId, {
    query: {
      staleTime: 0,
      gcTime: 0,
    }
  });

  return <WorkspaceNotesEditForm workspace={workspace} />;
}

export function WorkspacePanel({
  id,
  metadata,
}: TabPanelProps<WorkspaceTabMetadata>) {
  switch (metadata.mode) {
    case "create":
      return (
        <ScrollArea className="h-full px-8">
          <WorkspaceCreatePanel tabId={id} />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      );
    case "edit":
      return (
        <TabPanelFrame>
          <WorkspaceEditPanel tabId={id} workspaceId={metadata.id} />
        </TabPanelFrame>
      );
    case "edit-notes":
      return (
        <TabPanelFrame>
          <WorkspaceNotesEditPanel workspaceId={metadata.id} />
        </TabPanelFrame>
      );
  }
}

