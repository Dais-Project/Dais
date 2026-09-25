import { useEffect } from "react";
import { TaskType } from "@/api/generated/schemas";
import { useGetRunningTasks } from "@/api/tasks";
import { SIDEBAR_QUERY_GC_TIME } from "@/constants/query-options";
import SseDispatcher from "@/lib/sse-dispatcher";

export function useRunningTasks() {
  const query = useGetRunningTasks({
    query: { gcTime: SIDEBAR_QUERY_GC_TIME },
  });

  useEffect(() => (
    SseDispatcher.subscribe("TASK_EXECUTOR_CHANGED", (data) => {
      if (data.task_type === TaskType.task) query.refetch();
    })
  ), [query.refetch]);

  return query;
}
