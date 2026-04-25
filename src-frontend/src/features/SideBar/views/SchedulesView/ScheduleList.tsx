import { formatDistanceToNow } from "date-fns";
import { ClockIcon, EyeIcon, PlayIcon, PowerIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ScheduleBrief } from "@/api/generated/schemas";
import {
  disableSchedule,
  enableSchedule,
  getGetScheduleQueryKey,
  getGetScheduleRecordsInfiniteQueryKey,
  invalidateScheduleQueries,
  triggerScheduleRunNow,
  useDeleteSchedule,
  useGetSchedulesSuspenseInfinite,
} from "@/api/schedule";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
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
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { useSettingsStore } from "@/stores/settings-store";

type ScheduleListProps = {
  workspaceId: number;
};

function formatConfigSummary(schedule: ScheduleBrief) {
  switch (schedule.config.type) {
    case "cron":
      return `Cron: ${schedule.config.expression}`;
    case "polling":
      return `Polling: ${schedule.config.interval_sec}s`;
    case "delayed":
      return `Delayed: ${new Date(schedule.config.run_at * 1000).toLocaleString()}`;
    default:
      return "";
  }
}

type ScheduleItemProps = {
  schedule: ScheduleBrief;
  index: number;
  ref: React.Ref<HTMLDivElement>;
  onDelete: (schedule: ScheduleBrief) => void;
  onRunNow: (schedule: ScheduleBrief) => void;
  onToggleEnable: (schedule: ScheduleBrief) => void;
};

function ScheduleItem({
  schedule,
  index,
  ref,
  onDelete,
  onRunNow,
  onToggleEnable,
}: ScheduleItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);

  const nextRunDescription =
    schedule.config.type === "delayed"
      ? formatDistanceToNow(new Date(schedule.config.run_at * 1000), {
        addSuffix: true,
        locale: DATEFNS_LOCALE_MAP[language],
      })
      : t("schedules.list.next_run_unknown");

  return (
    <>
      <ActionableItem>
        <ActionableItemTrigger
          ref={ref}
          data-index={index}
          className="cursor-pointer"
          onClick={() => setIsRecordsOpen((prev) => !prev)}
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
          <ActionableItemMenuItem onClick={() => setIsRecordsOpen((prev) => !prev)}>
            <EyeIcon />
            <span>{t("schedules.menu.view_records")}</span>
          </ActionableItemMenuItem>
          <ActionableItemMenuItem onClick={() => onRunNow(schedule)}>
            <PlayIcon />
            <span>{t("schedules.menu.run_now")}</span>
          </ActionableItemMenuItem>
          <ActionableItemMenuItem onClick={() => onToggleEnable(schedule)}>
            <PowerIcon />
            <span>
              {schedule.is_enabled
                ? t("schedules.menu.disable")
                : t("schedules.menu.enable")}
            </span>
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
  const queryClient = useQueryClient();

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
        queryClient.removeQueries({ queryKey: getGetScheduleQueryKey(variables.scheduleId) });
        queryClient.removeQueries({ queryKey: getGetScheduleRecordsInfiniteQueryKey(variables.scheduleId) });
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
    await triggerScheduleRunNow(schedule.id);
    await invalidateScheduleQueries({ workspaceId, scheduleId: schedule.id });
    toast.success(t("schedules.toast.run_now_success_title"), {
      description: t("schedules.toast.run_now_success_description"),
    });
  };

  const handleToggleEnable = async (schedule: ScheduleBrief) => {
    if (schedule.is_enabled) {
      await disableSchedule(schedule.id);
      toast.success(t("schedules.toast.disable_success_title"), {
        description: t("schedules.toast.disable_success_description"),
      });
    } else {
      await enableSchedule(schedule.id);
      toast.success(t("schedules.toast.enable_success_title"), {
        description: t("schedules.toast.enable_success_description"),
      });
    }

    await invalidateScheduleQueries({ workspaceId, scheduleId: schedule.id });
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
            onRunNow={handleRunNow}
            onToggleEnable={handleToggleEnable}
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
