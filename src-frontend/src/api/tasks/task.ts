export {
  getTask,
  getGetTaskQueryKey,
  getGetTasksInfiniteQueryKey,
  useDeleteTask,
  useGetTaskSuspense,
  useGetTasksSuspenseInfinite,
  useGetRecentTasksSuspenseInfinite,
  useCreateTask,
  useSummarizeTaskTitle,
} from "../generated/endpoints/task/task";

import queryClient from "@/query-client";
import { API_BASE } from "..";
import {
  getGetTaskResourceFileUrl,
  getGetTaskQueryKey,
  getGetTasksInfiniteQueryKey,
  getGetRecentTasksInfiniteQueryKey,
} from "../generated/endpoints/task/task";
import type { TaskType } from "../generated/schemas";

type InvalidateTaskQueriesOptions = {
  workspaceId?: number;
  taskId?: number;
};

export function createTaskResourceUrl(
  taskType: TaskType,
  taskId: number,
  resourceId: number,
): URL {
  return new URL(
    getGetTaskResourceFileUrl(taskType, taskId, resourceId),
    API_BASE,
  );
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
