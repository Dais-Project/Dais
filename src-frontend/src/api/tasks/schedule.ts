export {
  triggerSchedule,
  useCancelScheduleExecution,
  useCreateSchedule,
  useDeleteSchedule,
  useGetScheduleRecordsSuspenseInfinite,
  useGetScheduleSuspense,
  useGetSchedulesSuspenseInfinite,
  useTriggerSchedule,
  useUpdateSchedule,
  useGetScheduleRunningJobsSuspense,
  useGetAllRunRecordsSuspenseInfinite,
  useGetRunRecordSuspense,
  useDeleteRunRecord,
} from "../generated/endpoints/schedule/schedule";

import queryClient from "@/query-client";
import {
  getGetAllRunRecordsInfiniteQueryKey,
  getGetRunRecordQueryKey,
  getGetScheduleQueryKey,
  getGetScheduleRecordsInfiniteQueryKey,
  getGetSchedulesInfiniteQueryKey,
  getGetScheduleRunningJobsQueryKey,
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
    await queryClient.invalidateQueries({ queryKey: getGetAllRunRecordsInfiniteQueryKey(), refetchType: "all" });
  }
}

export async function invalidateScheduleRunningJobsQuery() {
  const queryKey = getGetScheduleRunningJobsQueryKey();
  await queryClient.invalidateQueries({ queryKey, refetchType: "all" });
}
