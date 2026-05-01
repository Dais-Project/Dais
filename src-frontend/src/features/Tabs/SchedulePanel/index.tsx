import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetScheduleSuspense } from "@/api/tasks/schedule";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ScheduleTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../components/TabPanelFrame";
import { ScheduleCreateForm } from "./ScheduleCreateForm";
import { ScheduleEditForm } from "./ScheduleEditForm";
import { ScheduleRecordsPanel } from "./ScheduleRecordsPanel";

function ScheduleCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.remove);
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  useEffect(() => {
    if (!currentWorkspace) {
      removeTab(tabId);
    }
  }, [currentWorkspace, removeTab, tabId]);

  if (!currentWorkspace) {
    return null;
  }

  const handleComplete = () => removeTab(tabId);

  return (
    <ScheduleCreateForm
      workspaceId={currentWorkspace.id}
      onConfirm={handleComplete}
    />
  );
}

function ScheduleEditPanel({
  tabId,
  scheduleId,
}: {
  tabId: string;
  scheduleId: number;
}) {
  const removeTab = useTabsStore((state) => state.remove);
  const { data: schedule } = useGetScheduleSuspense(scheduleId);

  const handleComplete = () => removeTab(tabId);

  return <ScheduleEditForm schedule={schedule} onConfirm={handleComplete} />;
}

export function SchedulePanel({
  id,
  metadata,
}: TabPanelProps<ScheduleTabMetadata>) {
  switch (metadata.mode) {
    case "create":
      return (
        <ScrollArea className="h-full px-8">
          <ScheduleCreatePanel tabId={id} />
        </ScrollArea>
      );
    case "edit":
      return (
        <TabPanelFrame>
          <ScheduleEditPanel tabId={id} scheduleId={metadata.id} />
        </TabPanelFrame>
      );
    case "records":
      return (
        <TabPanelFrame>
          <ScheduleRecordsPanel scheduleId={metadata.id} />
        </TabPanelFrame>
      );
  }
}
