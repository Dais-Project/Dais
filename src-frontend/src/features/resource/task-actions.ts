import { InfiniteData } from "@tanstack/react-query";
import { produce } from "immer";
import type { PageTaskBrief } from "@/api/generated/schemas";
import { getGetRecentTasksInfiniteQueryKey } from "@/api/generated/endpoints/task/task";
import { getGetTasksInfiniteQueryKey } from "@/api/tasks";
import queryClient from "@/query-client";
import { useTabsStore } from "@/stores/tabs-store";

export function updateTaskTitle(workspaceId: number, task_id: number, title: string) {
  const updateList = produce((draft: InfiniteData<PageTaskBrief> | undefined) => {
    if (!draft) {
      return;
    }
    for (const page of draft.pages) {
      for (const item of page.items) {
        if (item.id === task_id) {
          item.title = title;
        }
      }
    }
  });
  queryClient.setQueriesData<InfiniteData<PageTaskBrief>>(
    { queryKey: getGetTasksInfiniteQueryKey({ workspace_id: workspaceId }) },
    updateList,
  );
  queryClient.setQueriesData<InfiniteData<PageTaskBrief>>(
    { queryKey: getGetRecentTasksInfiniteQueryKey() },
    updateList,
  );

  const updateTabs = useTabsStore.getState().update;
  updateTabs((draft) => {
    for (const tab of draft) {
      if (tab.type === "task" && tab.metadata.type === "task" && "id" in tab.metadata && tab.metadata.id === task_id) {
        tab.title = title;
        return;
      }
    }
  });
}
