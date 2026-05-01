import { InfiniteData } from "@tanstack/react-query";
import { produce } from "immer";
import type { PageTaskBrief } from "@/api/generated/schemas";
import { getGetTasksInfiniteQueryKey } from "@/api/tasks";
import queryClient from "@/query-client";
import { useTabsStore } from "@/stores/tabs-store";

export function updateTaskTitle(workspaceId: number, task_id: number, title: string) {
  const queryKey = getGetTasksInfiniteQueryKey({ workspace_id: workspaceId });
  queryClient.setQueryData<InfiniteData<PageTaskBrief>>(
    queryKey, produce((draft) => {
      if (!draft) {
        return;
      }
      for (const page of draft.pages) {
        for (const item of page.items) {
          if (item.id === task_id) {
            item.title = title;
            return;
          }
        }
      }
    })
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
