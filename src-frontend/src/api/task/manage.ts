export {
  getGetTaskQueryKey,
  getGetTasksInfiniteQueryKey,
  useDeleteTask,
  useGetTaskSuspense,
  useGetTasksSuspenseInfinite,
  useCreateTask,
  useSummarizeTaskTitle,
} from "../generated/endpoints/task/task";

import queryClient from "@/query-client";
import { getGetTaskQueryKey, getGetTasksInfiniteQueryKey } from "../generated/endpoints/task/task";

type InvalidateTaskQueriesOptions = {
  workspaceId?: number;
  taskId?: number;
};

export async function invalidateTaskQueries({
  workspaceId,
  taskId,
}: InvalidateTaskQueriesOptions) {
  if (workspaceId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetTasksInfiniteQueryKey({ workspace_id: workspaceId }), refetchType: "all" });
  }
  if (taskId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId), refetchType: "all" });
  }
}
