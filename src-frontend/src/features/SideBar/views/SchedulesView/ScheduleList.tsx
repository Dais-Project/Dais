import cronstrue from "cronstrue/i18n";
import { formatDuration } from "date-fns";
import {
  Clock7Icon,
  HistoryIcon,
  HourglassIcon,
  PencilIcon,
  PlayIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ScheduleBrief } from "@/api/generated/schemas";
import {
  invalidateScheduleQueries,
  invalidateScheduleRunningJobsQuery,
  useDeleteSchedule,
  useGetSchedulesSuspenseInfinite,
  useTriggerSchedule,
} from "@/api/tasks/schedule";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";
import { CRONSTRUE_LOCALE_MAP } from "@/i18n/locale-maps/cronstrue";
import { INTL_LOCALE_MAP } from "@/i18n/locale-maps/intl";

type ScheduleListProps = {
  workspaceId: number;
};

function createScheduleEditTab(scheduleId: number, scheduleName: string): Tab {
  return {
    type: "schedule",
    title: i18n.t("schedules.tab.edit_title_with_name", {
      ns: SIDEBAR_NAMESPACE,
      name: scheduleName,
    }),
    metadata: { mode: "edit", id: scheduleId },
  };
}

function createScheduleRecordsTab(scheduleId: number, scheduleName: string): Tab {
  return {
    type: "schedule",
    title: i18n.t("schedules.tab.records_title_with_name", {
      ns: SIDEBAR_NAMESPACE,
      name: scheduleName,
    }),
    metadata: { mode: "records", id: scheduleId },
  };
}

function openScheduleEditTab(scheduleId: number, scheduleName: string) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "schedule" &&
      tab.metadata.mode === "edit" &&
      tab.metadata.id === scheduleId,
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
    return;
  }

  addTab(createScheduleEditTab(scheduleId, scheduleName));
}

function openScheduleRecordsTab(scheduleId: number, scheduleName: string) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "schedule" &&
      tab.metadata.mode === "records" &&
      tab.metadata.id === scheduleId,
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
    return;
  }

  addTab(createScheduleRecordsTab(scheduleId, scheduleName));
}

function getScheduleIcon(schedule: ScheduleBrief) {
  switch (schedule.config.type) {
    case "cron": return Clock7Icon;
    case "polling": return RefreshCwIcon;
    case "delayed": return HourglassIcon;
    default: return Clock7Icon;
  }
}

function getConfigDescription(schedule: ScheduleBrief) {
  const language = useSettingsStore.getState().current.language;

  switch (schedule.config.type) {
    case "cron":
      return cronstrue.toString(schedule.config.expression, { locale: CRONSTRUE_LOCALE_MAP[language] });
    case "polling": {
      const totalSeconds = schedule.config.interval_sec;
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return i18n.t("schedules.list.polling_description_with_duration", {
        ns: SIDEBAR_NAMESPACE,
        duration: formatDuration({ days, hours, minutes, seconds }, { locale: DATEFNS_LOCALE_MAP[language] }),
      });
    }
    case "delayed":
      return i18n.t("schedules.list.delayed_description_with_datetime", {
        ns: SIDEBAR_NAMESPACE,
        datetime: new Date(schedule.config.scheduled_at * 1000).toLocaleString(INTL_LOCALE_MAP[language]),
      });
    default:
      return "";
  }
}

type ScheduleItemProps = {
  schedule: ScheduleBrief;
  index: number;
  ref: React.Ref<HTMLDivElement>;
  onDelete: (schedule: ScheduleBrief) => void;
  onEdit: (schedule: ScheduleBrief) => void;
  onViewRecords: (schedule: ScheduleBrief) => void;
  onTrigger: (schedule: ScheduleBrief) => void;
};

function ScheduleItem({
  schedule,
  index,
  ref,
  onDelete,
  onEdit,
  onViewRecords,
  onTrigger,
}: ScheduleItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const ScheduleIcon = getScheduleIcon(schedule);

  return (
    <ActionableItem>
      <ActionableItemTrigger
        ref={ref}
        data-index={index}
        className="cursor-pointer"
      >
        <ActionableItemIcon
          seed={schedule.is_enabled ? schedule.name : undefined}
          className={schedule.is_enabled ? undefined : "border-muted-foreground/20 bg-muted text-muted-foreground/50"}
        >
          <ScheduleIcon />
        </ActionableItemIcon>
        <ActionableItemInfo
          title={schedule.name}
          description={getConfigDescription(schedule)}
        />
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={() => onTrigger(schedule)}>
          <PlayIcon />
          <span>{t("schedules.menu.run_now")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem onClick={() => onEdit(schedule)}>
          <PencilIcon />
          <span>{t("schedules.menu.edit")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem onClick={() => onViewRecords(schedule)}>
          <HistoryIcon />
          <span>{t("schedules.menu.view_records")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem variant="destructive" onClick={() => onDelete(schedule)}>
          <TrashIcon />
          <span>{t("schedules.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function ScheduleList({ workspaceId }: ScheduleListProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const removeTabs = useTabsStore((state) => state.remove);

  const query = useGetSchedulesSuspenseInfinite(
    { workspace_id: workspaceId },
    { query: PAGINATED_QUERY_DEFAULT_OPTIONS }
  );

  const triggerScheduleMutation = useTriggerSchedule({
    mutation: {
      async onSuccess(_, variables) {
        await invalidateScheduleRunningJobsQuery();
        await invalidateScheduleQueries({ workspaceId, scheduleId: variables.scheduleId });
        toast.success(t("schedules.toast.run_now_success_title"), {
          description: t("schedules.toast.run_now_success_description"),
        });
      }
    }
  });

  const deleteScheduleMutation = useDeleteSchedule({
    mutation: {
      async onSuccess(_, variables) {
        await invalidateScheduleQueries({
          workspaceId,
          scheduleId: variables.scheduleId,
        });
        removeTabs((tab) => (
          tab.type === "schedule" &&
          tab.metadata.mode !== "create" &&
          tab.metadata.id === variables.scheduleId
        ));
        toast.success(t("schedules.toast.delete_success_title"), {
          description: t("schedules.toast.delete_success_description"),
        });
      },
    },
  });

  const asyncConfirm = useAsyncConfirm<ScheduleBrief>({
    async onConfirm(schedule) {
      await deleteScheduleMutation.mutateAsync({ scheduleId: schedule.id });
    },
  });

  const handleTrigger = async (schedule: ScheduleBrief) => {
    triggerScheduleMutation.mutate({ scheduleId: schedule.id });
  };

  const handleEdit = (schedule: ScheduleBrief) => {
    openScheduleEditTab(schedule.id, schedule.name);
  };

  const handleViewRecords = (schedule: ScheduleBrief) => {
    openScheduleRecordsTab(schedule.id, schedule.name);
  };

  if (query.data.pages.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>{t("schedules.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("schedules.empty.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <InfiniteVirtualScroll
        query={query}
        className="limit-width"
        selectItems={(page) => page.items}
        getItemKey={(item) => item.id}
        itemHeight={69}
        overscan={3}
        itemRender={({ item, key, index, ref }) => (
          <ScheduleItem
            key={key}
            schedule={item}
            ref={ref}
            index={index}
            onDelete={asyncConfirm.trigger}
            onEdit={handleEdit}
            onViewRecords={handleViewRecords}
            onTrigger={handleTrigger}
          />
        )}
      />

      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={t("schedules.dialog.delete_description_with_name", {
          name: asyncConfirm.pendingData?.name ?? "",
        })}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
