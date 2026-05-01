import { useLocalStorageState } from "ahooks";
import { Activity } from "react";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { RunningScheduleTaskList } from "./RunningScheduleTaskList";
import { ScheduleList } from "./ScheduleList";

function openScheduleCreateTab() {
  const currentWorkspace = useWorkspaceStore.getState().current;
  if (!currentWorkspace) {
    return;
  }

  const addTab = useTabsStore.getState().add;
  addTab({
    type: "schedule",
    title: i18n.t("schedules.tab.create_title", { ns: SIDEBAR_NAMESPACE }),
    metadata: { mode: "create" },
  });
}

function CurrentWorkspaceSchedules({
  workspaceId,
  className,
}: {
  workspaceId?: number;
  className?: string;
}) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  if (!workspaceId) {
    return (
      <Empty className={className}>
        <EmptyContent>
          <EmptyTitle>{t("schedules.empty.no_workspace.title")}</EmptyTitle>
          <EmptyDescription>{t("schedules.empty.no_workspace.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <ScheduleList workspaceId={workspaceId} />
      </AsyncBoundary>
    </div>
  );
}

function RunningScheduleTasks({ className, workspaceId }: { className?: string; workspaceId: number }) {
  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <RunningScheduleTaskList workspaceId={workspaceId} />
      </AsyncBoundary>
    </div>
  );
}

export function SchedulesView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [isRunningCollapsed, setIsRunningCollapsed] = useLocalStorageState("is-running-schedule-tasks-collapsed", {
    defaultValue: false,
  });
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  const handleRunningToggle = () => {
    setIsRunningCollapsed((prev) => !prev);
  };

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("schedules.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("schedules.header.create_tooltip")}
          onClick={openScheduleCreateTab}
          disabled={!currentWorkspace}
        />
      </SideBarHeader>

      <div className="flex min-h-0 flex-1 flex-col">
        <CurrentWorkspaceSchedules
          className="flex-1 min-h-0"
          workspaceId={currentWorkspace?.id}
        />

        <button
          type="button"
          onClick={handleRunningToggle}
          className="flex cursor-pointer items-center gap-1 border-y px-1.5 py-1.5 text-sm font-medium outline-none"
        >
          {isRunningCollapsed
            ? <ChevronRightIcon className="size-4" />
            : <ChevronDownIcon className="size-4" />}
          {t("schedules.running.title")}
        </button>
        {currentWorkspace && (
          <Activity mode={isRunningCollapsed ? "hidden" : "visible"}>
            <RunningScheduleTasks className="min-h-0 flex-1" workspaceId={currentWorkspace.id} />
          </Activity>
        )}
      </div>
    </div>
  );
}

SchedulesView.componentId = "schedules";
