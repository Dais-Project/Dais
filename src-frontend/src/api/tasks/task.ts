export {
  getTask,
  getGetTaskQueryKey,
  getGetTasksInfiniteQueryKey,
  useDeleteTask,
  useGetTaskSuspense,
  useGetTasksSuspenseInfinite,
  useGetRecentTasksSuspenseInfinite,
  useGetRunningTasks,
  useCreateTask,
  useSummarizeTaskTitle,
} from "../generated/endpoints/task/task";

import { useSuspenseQuery } from "@tanstack/react-query";
import queryClient from "@/query-client";
import {
  createTaskResourceAccessUrl,
  getGetTaskQueryKey,
  getGetTasksInfiniteQueryKey,
  getGetRecentTasksInfiniteQueryKey,
} from "../generated/endpoints/task/task";
import type { TaskResourceAccessUrlCreate } from "../generated/schemas";

const TASK_RESOURCE_ACCESS_URL_STALE_TIME = 24 * 60 * 60 * 1000;

type InvalidateTaskQueriesOptions = {
  workspaceId?: number;
  taskId?: number;
};

/**
 * Orval treats this POST endpoint as a mutation, but resource URLs need
 * Suspense and query-key-based reuse, so the generated request is wrapped here.
 */
export function useTaskResourceAccessUrlSuspense(
  data: TaskResourceAccessUrlCreate,
) {
  return useSuspenseQuery({
    queryKey: [
      "TaskResourceAccessUrl",
      data.task_type,
      data.task_id,
      data.resource_id,
    ],
    queryFn: () => createTaskResourceAccessUrl(data),
    staleTime: TASK_RESOURCE_ACCESS_URL_STALE_TIME,
  });
}

export async function invalidateTaskQueries({
  workspaceId,
  taskId,
}: InvalidateTaskQueriesOptions) {
  if (workspaceId !== undefined) {
    await queryClient.invalidateQueries({
      queryKey: getGetTasksInfiniteQueryKey({ workspace_id: workspaceId }),
      refetchType: "all",
    });
  }
  if (taskId !== undefined) {
    await queryClient.invalidateQueries({
      queryKey: getGetTaskQueryKey(taskId),
      refetchType: "all",
    });
  }
  await queryClient.invalidateQueries({
    queryKey: getGetRecentTasksInfiniteQueryKey(),
  });
}
