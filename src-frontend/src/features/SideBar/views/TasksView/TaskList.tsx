import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import type { TaskBrief } from "@/api/generated/schemas";
import {
  getGetTaskQueryKey,
  useDeleteTask,
  useGetTasksSuspenseInfinite,
  useSummarizeTaskTitle,
} from "@/api/task";
import { invalidateTaskQueries } from "@/api/task";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { updateTaskTitle } from "@/features/resource/task-actions";
import { TaskItem, openTaskTab, removeTaskTab } from "./shared";

type TaskListProps = {
  workspaceId: number;
};

export function TaskList({ workspaceId }: TaskListProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const queryClient = useQueryClient();
  const deleteTaskMutation = useDeleteTask();
  const summarizeTaskTitleMutation = useSummarizeTaskTitle({
    mutation: {
      onSuccess(taskRead) {
        updateTaskTitle(workspaceId, taskRead.id, taskRead.title);
      },
    },
  });

  const asyncConfirm = useAsyncConfirm<TaskBrief>({
    async onConfirm(task) {
      await deleteTaskMutation.mutateAsync({ taskId: task.id });
      await invalidateTaskQueries({ workspaceId, taskId: task.id });
      queryClient.removeQueries({
        queryKey: getGetTaskQueryKey(task.id),
      });
      removeTaskTab(task.id);
      toast.success(t("tasks.toast.delete_success_title"), {
        description: t("tasks.toast.delete_success_description"),
      });
    }
  });

  const handleRegenerateTitle = (task: TaskBrief) => {
    summarizeTaskTitleMutation.mutate({ taskId: task.id });
  };

  const query = useGetTasksSuspenseInfinite(
    { workspace_id: workspaceId },
    { query: PAGINATED_QUERY_DEFAULT_OPTIONS }
  );

  if (query.data.pages.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>{t("tasks.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("tasks.empty.description")}</EmptyDescription>
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
        overscan={3}
        itemRender={({ item, key, index, ref }) => (
          <TaskItem
            key={key}
            task={item}
            ref={ref}
            index={index}
            onOpen={() => openTaskTab(workspaceId, item)}
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
