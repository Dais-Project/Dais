import { useEffect } from "react";
import { useGetRunningTasks } from "@/api/tasks";
import { SIDEBAR_QUERY_GC_TIME } from "@/constants/query-options";
import SseDispatcher from "@/lib/sse-dispatcher";

export function useRunningTasks() {
  const query = useGetRunningTasks({
    query: { gcTime: SIDEBAR_QUERY_GC_TIME },
  });

  useEffect(() => (
    SseDispatcher.subscribe("TASK_EXECUTOR_CHANGED", () => {
      query.refetch();
    })
  ), [query.refetch]);

  return query;
}
