import { formatDistanceToNow } from "date-fns";
import { ClockIcon, HistoryIcon, PencilIcon, PlayIcon, TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ScheduleBrief } from "@/api/generated/schemas";
import {
  invalidateScheduleQueries,
  triggerSchedule,
  useDeleteSchedule,
  useGetSchedulesSuspenseInfinite,
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

function formatConfigSummary(schedule: ScheduleBrief) {
  switch (schedule.config.type) {
    case "cron":
      return `Cron: ${schedule.config.expression}`;
    case "polling":
      return `Polling: ${schedule.config.interval_sec}s`;
    case "delayed":
      return `Delayed: ${new Date(schedule.config.scheduled_at * 1000).toLocaleString()}`;
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
  onRunNow: (schedule: ScheduleBrief) => void;
};

function ScheduleItem({
  schedule,
  index,
  ref,
  onDelete,
  onEdit,
  onViewRecords,
  onRunNow,
}: ScheduleItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);

  const nextRunDescription =
    schedule.config.type === "delayed"
      ? formatDistanceToNow(new Date(schedule.config.scheduled_at * 1000), {
        addSuffix: true,
        locale: DATEFNS_LOCALE_MAP[language],
      })
      : null;

  return (
    <>
      <ActionableItem>
        <ActionableItemTrigger
          ref={ref}
          data-index={index}
          className="cursor-pointer"
        >
          <ActionableItemIcon seed={schedule.name}>
            <ClockIcon />
          </ActionableItemIcon>
          <ActionableItemInfo
            title={schedule.name}
            description={`${formatConfigSummary(schedule)} · ${nextRunDescription}`}
          />
        </ActionableItemTrigger>

        <ActionableItemMenu>
          <ActionableItemMenuItem onClick={() => onRunNow(schedule)}>
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
    </>
  );
}

export function ScheduleList({ workspaceId }: ScheduleListProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const removeTabs = useTabsStore((state) => state.remove);

  const query = useGetSchedulesSuspenseInfinite(
    { workspace_id: workspaceId },
    { query: PAGINATED_QUERY_DEFAULT_OPTIONS }
  );

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

  const handleRunNow = async (schedule: ScheduleBrief) => {
    await triggerSchedule(schedule.id);
    await invalidateScheduleQueries({ workspaceId, scheduleId: schedule.id });
    toast.success(t("schedules.toast.run_now_success_title"), {
      description: t("schedules.toast.run_now_success_description"),
    });
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
            onRunNow={handleRunNow}
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
