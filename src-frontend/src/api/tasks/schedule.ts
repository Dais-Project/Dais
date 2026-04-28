export {
  triggerSchedule,
  useCreateSchedule,
  useDeleteSchedule,
  useGetRunRecordSuspense,
  useGetScheduleRecordsSuspenseInfinite,
  useGetScheduleSuspense,
  useGetSchedulesSuspenseInfinite,
  useTriggerSchedule,
  useUpdateSchedule,
} from "../generated/endpoints/schedule/schedule";

import queryClient from "@/query-client";
import {
  getGetRunRecordQueryKey,
  getGetScheduleQueryKey,
  getGetScheduleRecordsInfiniteQueryKey,
  getGetSchedulesInfiniteQueryKey,
} from "../generated/endpoints/schedule/schedule";

type InvalidateScheduleQueriesOptions = {
  workspaceId?: number;
  scheduleId?: number;
  runRecordId?: number;
};

export async function invalidateScheduleQueries({
  workspaceId,
  scheduleId,
  runRecordId,
}: InvalidateScheduleQueriesOptions = {}) {
  if (workspaceId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetSchedulesInfiniteQueryKey({ workspace_id: workspaceId }), refetchType: "all" });
  }
  if (scheduleId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(scheduleId), refetchType: "all" });
    await queryClient.invalidateQueries({ queryKey: getGetScheduleRecordsInfiniteQueryKey(scheduleId), refetchType: "all" });
  }
  if (runRecordId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetRunRecordQueryKey(runRecordId), refetchType: "all" });
  }
}
