import { formatDistanceToNow } from "date-fns";
import { ArrowUpRightIcon, HistoryIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RunRecordBrief, ScheduleRead } from "@/api/generated/schemas";
import {
  useGetScheduleRecordsSuspenseInfinite,
  useGetScheduleSuspense,
} from "@/api/tasks/schedule";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import {
  ActionableItem,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ItemDescription, ItemTitle } from "@/components/ui/item";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { INTL_LOCALE_MAP } from "@/i18n/locale-maps/intl";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabsStore } from "@/stores/tabs-store";
import { useMemo } from "react";

function openScheduleRecordTab(schedule: ScheduleRead, record: RunRecordBrief) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find((tab) => (
    tab.type === "task" &&
    tab.metadata.type === "schedule" &&
    tab.metadata.id === record.id
  ));

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
  index: number;
  itemRef: React.Ref<HTMLDivElement>;
};

function ScheduleRecordItem({
  record,
  schedule,
  index,
  itemRef,
}: ScheduleRecordItemProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);

  return (
    <ActionableItem>
      <ActionableItemTrigger
        ref={itemRef}
        className="cursor-pointer border rounded"
        onClick={() => openScheduleRecordTab(schedule, record)}
        data-index={index}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
            <HistoryIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <ItemTitle className="truncate">
              {formatDistanceToNow(new Date(record.run_at * 1000), {
                addSuffix: true,
                locale: DATEFNS_LOCALE_MAP[language],
              })}
            </ItemTitle>
            <ItemDescription className="truncate whitespace-nowrap">
              {new Date(record.run_at * 1000).toLocaleString(INTL_LOCALE_MAP[language])}
            </ItemDescription>
          </div>
        </div>
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={() => openScheduleRecordTab(schedule, record)}>
          <ArrowUpRightIcon />
          <span>{t("records.view_detail")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

function ScheduleRecordsList({ schedule }: { schedule: ScheduleRead }) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const query = useGetScheduleRecordsSuspenseInfinite(
    schedule.id,
    undefined,
    { query: PAGINATED_QUERY_DEFAULT_OPTIONS },
  );

  const records = useMemo(() =>
    query.data.pages.flatMap((page) => page.items),
    [query.data]);

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
        gap={4}
        paddingEnd={2}
        itemRender={({ item, index, key, ref }) => (
          <ScheduleRecordItem
            key={key}
            record={item}
            schedule={schedule}
            index={index}
            itemRef={ref}
          />
        )}
      />
    </div>
  );
}

export function ScheduleRecordsPanel({ scheduleId }: { scheduleId: number }) {
  const { data: schedule } = useGetScheduleSuspense(scheduleId);

  return <ScheduleRecordsList schedule={schedule} />;
}
