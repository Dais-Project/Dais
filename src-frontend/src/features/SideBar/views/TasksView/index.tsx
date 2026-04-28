import { Activity } from "react";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18n } from "@/i18n";
import { TABS_TASK_NAMESPACE, SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  Empty,
  EmptyTitle,
  EmptyContent,
  EmptyDescription,
} from "@/components/ui/empty";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { activityVisible } from "@/lib/activity-visible";
import { TaskList } from "./TaskList";
import { RecentTaskList } from "./RecentTaskList";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { useLocalStorageState } from "ahooks";

function openTaskCreateTab(workspaceId: number) {
  const addTab = useTabsStore.getState().add;
  addTab({
    title: i18n.t("tab.default_title", { ns: TABS_TASK_NAMESPACE }),
    type: "task",
    metadata: {
      type: "task",
      isDraft: true,
      workspace_id: workspaceId,
    },
  });
}


function CurrentWorkspaceTasks({ workspaceId, className }: {
  workspaceId?: number,
  className?: string,
}) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  if (!workspaceId) {
    return (
      <Empty className={className}>
        <EmptyContent>
          <EmptyTitle>{t("tasks.empty.no_workspace.title")}</EmptyTitle>
          <EmptyDescription>{t("tasks.empty.no_workspace.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <TaskList workspaceId={workspaceId} />
      </AsyncBoundary>
    </div>
  );
}

function RecentTasks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <RecentTaskList />
      </AsyncBoundary>
    </div>
  );
}

export function TasksView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [isRecentCollapsed, setIsRecentCollapsed] = useLocalStorageState("is-recent-tasks-collapsed", {
    defaultValue: false,
  });
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  const handleRecentToggle = () => {
    setIsRecentCollapsed((prev) => !prev);
  };

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("tasks.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("tasks.header.create_tooltip")}
          onClick={() => currentWorkspace && openTaskCreateTab(currentWorkspace.id)}
          disabled={currentWorkspace === null}
        />
      </SideBarHeader>
      <div className="flex flex-col flex-1 min-h-0">
        <CurrentWorkspaceTasks className="flex-1 min-h-0" workspaceId={currentWorkspace?.id} />

        <button
          onClick={handleRecentToggle}
          className="flex items-center gap-1 py-1.5 px-1.5 font-medium text-sm border-y cursor-pointer outline-none"
        >
          {isRecentCollapsed
            ? <ChevronRightIcon className="size-4" />
            : <ChevronDownIcon className="size-4" />
          }
          最近任务
        </button>
        <Activity mode={activityVisible(!isRecentCollapsed)}>
          <RecentTasks className="flex-1 min-h-0" />
        </Activity>
      </div>
    </div>
  );
}
TasksView.componentId = "tasks";
