import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import type { RunRecordBrief, ScheduleRead } from "@/api/generated/schemas";
import { useGetScheduleRecordsSuspenseInfinite, useGetScheduleSuspense } from "@/api/tasks/schedule";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { useSettingsStore } from "@/stores/settings-store";

function ScheduleRecordsList({ schedule }: { schedule: ScheduleRead }) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);
  const query = useGetScheduleRecordsSuspenseInfinite(
    schedule.id,
    undefined,
    { query: PAGINATED_QUERY_DEFAULT_OPTIONS },
  );

  const records = query.data.pages.flatMap((page) => page.items);

  if (records.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>{t("schedules.records.empty")}</EmptyTitle>
          <EmptyDescription>{schedule.name}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <InfiniteScroll
      query={query}
      selectItems={(page) => page.items}
      itemRender={(record: RunRecordBrief, index) => (
        <Item key={record.id} variant="outline" className={index === 0 ? "mt-0" : "mt-3"}>
          <ItemContent>
            <ItemTitle>
              {formatDistanceToNow(new Date(record.run_at * 1000), {
                addSuffix: true,
                locale: DATEFNS_LOCALE_MAP[language],
              })}
            </ItemTitle>
            <ItemDescription>
              {new Date(record.run_at * 1000).toLocaleString(language)}
            </ItemDescription>
          </ItemContent>
        </Item>
      )}
    />
  );
}

export function ScheduleRecordsPanel({ scheduleId }: { scheduleId: number }) {
  const { data: schedule } = useGetScheduleSuspense(scheduleId);

  return <ScheduleRecordsList schedule={schedule} />;
}
