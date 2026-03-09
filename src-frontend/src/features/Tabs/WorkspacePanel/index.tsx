import { useTranslation } from "react-i18next";
import { useGetWorkspaceSuspense } from "@/api/workspace";
import { FailedToLoad } from "@/components/custom/FailedToLoad";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTabsStore } from "@/stores/tabs-store";
import type { WorkspaceTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../TabPanelFrame";
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
  tabId,
  metadata,
}: TabPanelProps<WorkspaceTabMetadata>) {
  const { t } = useTranslation("tabs-workspace");

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
      errorRender={({ resetErrorBoundary }) => (
        <div className="flex h-full items-center justify-center p-4">
          <FailedToLoad
            refetch={resetErrorBoundary}
            description={t("panel.error.load_description")}
          />
        </div>
      )}
    >
      <WorkspaceEditPanel tabId={tabId} workspaceId={metadata.id} />
    </TabPanelFrame>
  );
}
