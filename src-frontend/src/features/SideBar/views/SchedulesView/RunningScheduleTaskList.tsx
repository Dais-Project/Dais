import { formatDistanceToNow } from "date-fns";
import { ActivityIcon, SquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ScheduleRunningJob } from "@/api/generated/schemas";
import {
  invalidateScheduleRunningJobsQuery,
  useCancelScheduleExecution,
  useGetScheduleRunningJobsSuspense,
} from "@/api/tasks/schedule";
import {
  ActionableItem,
  ActionableItemActionButton,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useSettingsStore } from "@/stores/settings-store";

function RunningScheduleTaskItem({ task }: { task: ScheduleRunningJob }) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);

  const cancelScheduleExecutionMutation = useCancelScheduleExecution({
    mutation: {
      async onSuccess() {
        await invalidateScheduleRunningJobsQuery();
        toast.success(t("schedules.toast.cancel_run_success_title"), {
          description: t("schedules.toast.cancel_run_success_description"),
        });
      },
    },
  });

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    cancelScheduleExecutionMutation.mutate({ jobId: task.id });
  };

  return (
    <ActionableItem>
      <ActionableItemTrigger
        actions={(
          <ActionableItemActionButton
            icon={SquareIcon}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            title={t("schedules.running.cancel")}
            aria-label={t("schedules.running.cancel")}
            disabled={cancelScheduleExecutionMutation.isPending}
            onClick={handleCancel}
          />
        )}
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
    </ActionableItem>
  );
}

export function RunningScheduleTaskList() {
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
        <RunningScheduleTaskItem task={task} key={task.id} />
      ))}
    </div>
  );
}
