import { formatDistanceToNow } from "date-fns";
import { ArrowUpRightIcon, HistoryIcon, TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { RunRecordBrief, ScheduleRead } from "@/api/generated/schemas";
import {
  invalidateScheduleQueries,
  useDeleteRunRecord,
  useGetScheduleRecordsSuspenseInfinite,
  useGetScheduleSuspense,
} from "@/api/tasks/schedule";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/query-options";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { INTL_LOCALE_MAP } from "@/i18n/locale-maps/intl";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabsStore } from "@/stores/tabs-store";
import { useMemo } from "react";

function openScheduleRecordTab(schedule: ScheduleRead, record: RunRecordBrief) {
  const {
    tabs,
    add: addTab,
    setActive: setActiveTab,
  } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "task" &&
      tab.metadata.type === "schedule" &&
      tab.metadata.id === record.id,
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
    return;
  }

  addTab({
    title: `${schedule.name} #${record.id}`,
    icon: "history",
    type: "task",
    metadata: {
      type: "schedule",
      id: record.id,
      workspace_id: schedule.workspace_id,
    },
  });
}

type ScheduleRecordItemProps = {
  record: RunRecordBrief;
  schedule: ScheduleRead;
  onDelete: (record: RunRecordBrief) => void;
};

function ScheduleRecordItem({
  record,
  schedule,
  onDelete,
}: ScheduleRecordItemProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);

  return (
    <ActionableItem>
      <ActionableItemTrigger
        className="cursor-pointer"
        onClick={() => openScheduleRecordTab(schedule, record)}
      >
        <ActionableItemIcon>
          <HistoryIcon />
        </ActionableItemIcon>
        <ActionableItemInfo
          title={formatDistanceToNow(new Date(record.run_at * 1000), {
            addSuffix: true,
            locale: DATEFNS_LOCALE_MAP[language],
          })}
          description={new Date(record.run_at * 1000).toLocaleString(
            INTL_LOCALE_MAP[language],
          )}
        />
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem
          onClick={() => openScheduleRecordTab(schedule, record)}
        >
          <ArrowUpRightIcon />
          <span>{t("records.view_detail")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem
          variant="destructive"
          onClick={() => onDelete(record)}
        >
          <TrashIcon />
          <span>{t("records.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

function ScheduleRecordsList({ schedule }: { schedule: ScheduleRead }) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);

  const deleteRunRecordMutation = useDeleteRunRecord({
    mutation: {
      async onSuccess(_, variables) {
        await invalidateScheduleQueries({
          scheduleId: schedule.id,
          runRecordId: variables.runRecordId,
        });
        useTabsStore
          .getState()
          .remove(
            (tab) =>
              tab.type === "task" &&
              tab.metadata.type === "schedule" &&
              tab.metadata.id === variables.runRecordId,
          );
        toast.success(t("toast.records.delete_success_title"), {
          description: t("toast.records.delete_success_description"),
        });
      },
    },
  });

  const handleDelete = (record: RunRecordBrief) => {
    deleteRunRecordMutation.mutate({ runRecordId: record.id });
  };

  const query = useGetScheduleRecordsSuspenseInfinite(schedule.id, undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const records = useMemo(
    () => query.data.pages.flatMap((page) => page.items),
    [query.data],
  );

  if (records.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>{t("records.empty")}</EmptyTitle>
          <EmptyDescription>{schedule.name}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex max-w-3xl mx-auto h-full min-h-0 flex-col py-4">
      <div className="pb-4">
        <h2 className="font-semibold text-lg">
          {t("records.title_with_name", { name: schedule.name })}
        </h2>
      </div>

      <InfiniteVirtualScroll
        className="h-full min-h-0 flex-1"
        query={query}
        selectItems={(page) => page.items}
        getItemKey={(record) => record.id}
        itemHeight={65}
        paddingEnd={2}
        itemRender={({ item, index, key, ref }) => (
          <div ref={ref} key={key} className="pb-2" data-index={index}>
            <ScheduleRecordItem
              record={item}
              schedule={schedule}
              onDelete={handleDelete}
            />
          </div>
        )}
      />
    </div>
  );
}

export function ScheduleRecordsPanel({ scheduleId }: { scheduleId: number }) {
  const { data: schedule } = useGetScheduleSuspense(scheduleId);

  return <ScheduleRecordsList schedule={schedule} />;
}
