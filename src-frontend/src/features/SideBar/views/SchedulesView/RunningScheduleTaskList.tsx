import { formatDistanceToNow } from "date-fns";
import { ActivityIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ScheduleRunningJob } from "@/api/generated/schemas";
import { useGetScheduleRunningJobsSuspense } from "@/api/tasks/schedule";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabsStore } from "@/stores/tabs-store";

type ScheduleRunningTaskTabTarget = ScheduleRunningJob & {
  workspace_id: number;
};

type RunningScheduleTaskListProps = {
  workspaceId: number;
};

type RunningScheduleTaskItemProps = {
  task: ScheduleRunningJob;
  workspaceId: number;
};

function openScheduleRunningTaskTab(task: ScheduleRunningTaskTabTarget) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find((tab) => (
    tab.type === "task" &&
    tab.metadata.type === "schedule" &&
    tab.metadata.id === task.id
  ));

  if (existingTab) {
    setActiveTab(existingTab.id);
    return;
  }

  addTab({
    title: `${task.name} #${task.id}`,
    icon: "history",
    type: "task",
    metadata: {
      type: "schedule",
      id: task.id,
      workspace_id: task.workspace_id,
    },
  });
}

function RunningScheduleTaskItem({ task, workspaceId }: RunningScheduleTaskItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);
  const tabTarget = {
    ...task,
    workspace_id: workspaceId,
  } satisfies ScheduleRunningTaskTabTarget;

  return (
    <ActionableItem>
      <ActionableItemTrigger
        className="cursor-pointer"
        onClick={() => openScheduleRunningTaskTab(tabTarget)}
      >
        <ActionableItemIcon seed={task.name}>
          <ActivityIcon />
        </ActionableItemIcon>
        <ActionableItemInfo
          title={task.name}
          description={t("schedules.running.description_with_created_at", {
            time: formatDistanceToNow(new Date(task.created_at * 1000), {
              addSuffix: true,
              locale: DATEFNS_LOCALE_MAP[language],
            }),
          })}
        />
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={() => openScheduleRunningTaskTab(tabTarget)}>
          <ActivityIcon />
          <span>{t("schedules.running.open")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function RunningScheduleTaskList({ workspaceId }: RunningScheduleTaskListProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const query = useGetScheduleRunningJobsSuspense();

  if (query.data.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>{t("schedules.running.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("schedules.running.empty.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="limit-width">
      {query.data.map((task) => (
        <RunningScheduleTaskItem
          key={task.id}
          task={task}
          workspaceId={workspaceId}
        />
      ))}
    </div>
  );
}
