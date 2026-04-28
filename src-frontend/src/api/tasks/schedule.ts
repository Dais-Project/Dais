export {
  useCreateSchedule,
  useDeleteSchedule,
  useGetRunRecordSuspense,
  useGetScheduleRecordsSuspenseInfinite,
  useGetScheduleSuspense,
  useGetSchedulesSuspenseInfinite,
  useUpdateSchedule,
} from "../generated/endpoints/schedule/schedule";

import queryClient from "@/query-client";
import {
  getGetRunRecordQueryKey,
  getGetScheduleQueryKey,
  getGetScheduleRecordsInfiniteQueryKey,
  getGetSchedulesInfiniteQueryKey,
} from "../generated/endpoints/schedule/schedule";

export async function triggerScheduleRunNow(_scheduleId: number) {
  // TODO: 后端实现 run-now 接口后补充调用逻辑
}

export async function enableSchedule(_scheduleId: number) {
  // TODO: 后端实现 enable 接口后补充调用逻辑
}

export async function disableSchedule(_scheduleId: number) {
  // TODO: 后端实现 disable 接口后补充调用逻辑
}

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
