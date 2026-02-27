export {
  getGetTaskQueryKey,
  getGetTasksInfiniteQueryKey,
  useDeleteTask,
  useGetTaskSuspense,
  useGetTasksSuspenseInfinite,
  useNewTask,
} from "../generated/endpoints/task/task";

import queryClient from "@/query-client";
import { getGetTaskQueryKey, getGetTasksInfiniteQueryKey } from "../generated/endpoints/task/task";

type InvalidateTaskQueriesOptions = {
  workspaceId: number;
  taskId?: number;
};

export async function invalidateTaskQueries({
  workspaceId,
  taskId,
}: InvalidateTaskQueriesOptions) {
  await queryClient.invalidateQueries({ queryKey: getGetTasksInfiniteQueryKey({ workspace_id: workspaceId }) });
  if (taskId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
  }
}
