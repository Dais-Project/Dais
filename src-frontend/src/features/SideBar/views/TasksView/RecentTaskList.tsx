import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { TaskBrief } from "@/api/generated/schemas";
import {
  getTask,
  getGetTaskQueryKey,
  invalidateTaskQueries,
  useDeleteTask,
  useGetRecentTasksSuspenseInfinite,
  useSummarizeTaskTitle,
} from "@/api/task";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { updateTaskTitle } from "@/features/resource/task-actions";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { TaskItem, openTaskTab, removeTaskTab } from "./shared";

export function RecentTaskList() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const queryClient = useQueryClient();

  const deleteTaskMutation = useDeleteTask();
  const summarizeTaskTitleMutation = useSummarizeTaskTitle({
    mutation: {
      onSuccess(taskRead) {
        updateTaskTitle(taskRead.workspace_id, taskRead.id, taskRead.title);
      },
    },
  });

  const asyncConfirm = useAsyncConfirm<TaskBrief>({
    async onConfirm(task) {
      await deleteTaskMutation.mutateAsync({ taskId: task.id });
      await invalidateTaskQueries({ taskId: task.id });
      queryClient.removeQueries({ queryKey: getGetTaskQueryKey(task.id) });
      removeTaskTab(task.id);

      toast.success(t("tasks.toast.delete_success_title"), {
        description: t("tasks.toast.delete_success_description"),
      });
    },
  });

  const query = useGetRecentTasksSuspenseInfinite({ size: 20 }, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS
  });
  const allItems = query.data.pages.flatMap((page) => page.items);

  const handleOpen = async (task: TaskBrief) => {
    const taskRead = await getTask(task.id);
    openTaskTab(taskRead.workspace_id, task);
  };

  const handleRegenerateTitle = (task: TaskBrief) => {
    summarizeTaskTitleMutation.mutate({ taskId: task.id });
  };

  if (allItems.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>{t("tasks.recent.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("tasks.recent.empty.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <InfiniteVirtualScroll
        query={query}
        className="limit-width"
        selectItems={(page) => page.items}
        itemHeight={69}
        overscan={1}
        itemRender={({ item, key, index, ref }) => (
          <TaskItem
            key={key}
            task={item}
            ref={ref}
            index={index}
            onOpen={handleOpen}
            onDelete={asyncConfirm.trigger}
            onRegenerateTitle={handleRegenerateTitle}
          />
        )}
      />

      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={t("tasks.dialog.delete_description_with_name", {
          name: asyncConfirm.pendingData?.title ?? "",
        })}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
