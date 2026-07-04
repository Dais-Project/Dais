import { useEffect } from "react";
import { useGetScheduleSuspense } from "@/api/tasks/schedule";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ScheduleTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../components/TabPanelFrame";
import { AllScheduleRecordsPanel } from "./AllScheduleRecordsPanel";
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

function ScheduleRecordsPanelSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col px-8 py-4">
      <div className="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-col">
        <div className="pb-4">
          <Skeleton className="h-7 w-56" />
        </div>

        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`schedule-record-skeleton-${index}`}
              className="flex items-center gap-3 border-b pb-2"
            >
              <Skeleton className="size-9 rounded-md" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SchedulePanel({
  id,
  metadata,
}: TabPanelProps<ScheduleTabMetadata>) {
  switch (metadata.mode) {
    case "create":
      return (
        <TabPanelFrame>
          <ScheduleCreatePanel tabId={id} />
        </TabPanelFrame>
      );
    case "edit":
      return (
        <TabPanelFrame>
          <ScheduleEditPanel tabId={id} scheduleId={metadata.id} />
        </TabPanelFrame>
      );
    case "records":
      return (
        <AsyncBoundary skeleton={<ScheduleRecordsPanelSkeleton />}>
          <ScrollArea className="h-full px-8">
            <ScheduleRecordsPanel scheduleId={metadata.id} />
          </ScrollArea>
        </AsyncBoundary>
      );
    case "all-records":
      return (
        <AsyncBoundary skeleton={<ScheduleRecordsPanelSkeleton />}>
          <ScrollArea className="h-full px-8">
            <AllScheduleRecordsPanel />
          </ScrollArea>
        </AsyncBoundary>
      );
  }
}
