import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { PencilIcon, TrashIcon } from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import type { PageTaskBrief, TaskBrief } from "@/api/generated/schemas";
import {
  getGetTaskQueryKey,
  getGetTasksInfiniteQueryKey,
  useDeleteTask,
  useGetTasksSuspenseInfinite,
} from "@/api/task";
import { invalidateTaskQueries } from "@/api/task";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { useEffect } from "react";
import SseDispatcher from "@/lib/sse-dispatcher";
import { produce } from "immer";
import { DynamicIcon, IconName } from "lucide-react/dynamic";

function openTaskTab(task: TaskBrief) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find((t) => t.type === "task" && !t.metadata.isDraft && t.metadata.id === task.id);

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    addTab({
      id: tabIdFactory(),
      title: task.title,
      type: "task",
      metadata: {
        isDraft: false,
        id: task.id,
      },
    });
  }
}

function removeTaskTab(taskId: number) {
  const removeTabsPattern = useTabsStore.getState().removePattern;
  removeTabsPattern((tab) => tab.type === "task" && !tab.metadata.isDraft && tab.metadata.id === taskId);
}

type TaskItemProps = {
  task: TaskBrief;
  onDelete: (task: TaskBrief) => void;
};

function TaskItem({ task, onDelete }: TaskItemProps) {
  const handleClick = () => {
    openTaskTab(task);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info("重命名功能", {
      description: "重命名功能待实现",
    });
  };

  return (
    <ActionableItem>
      <ActionableItemTrigger onClick={handleClick}>
        <ActionableItemIcon>
          <DynamicIcon name={task.icon_name as IconName} />
        </ActionableItemIcon>
        <ActionableItemInfo
          title={task.title}
          description={formatDistanceToNow(new Date(task.last_run_at * 1000), {
            addSuffix: true,
          })}
        />
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleRename}>
          <PencilIcon className="mr-2 size-4" />
          <span>编辑任务名称</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem className="text-destructive" onClick={() => onDelete(task)}>
          <TrashIcon className="mr-2 size-4" />
          <span>删除任务</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

type TaskListProps = {
  workspaceId: number;
};

export function TaskList({ workspaceId }: TaskListProps) {
  const queryClient = useQueryClient();
  const deleteTaskMutation = useDeleteTask();

  useEffect(() => 
    SseDispatcher.subscribe("task_title_updated", ({ task_id, title}) => {
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
    })
  , [queryClient, workspaceId]);

  const asyncConfirm = useAsyncConfirm<TaskBrief>({
    async onConfirm(task) {
      await deleteTaskMutation.mutateAsync({ taskId: task.id });
      await invalidateTaskQueries({ workspaceId, taskId: task.id });
      queryClient.removeQueries({
        queryKey: getGetTaskQueryKey(task.id),
      });
      removeTaskTab(task.id);
      toast.success("删除成功", {
        description: "已成功删除任务。",
      });
    },
    onError(error: Error) {
      toast.error("删除失败", {
        description: error.message || "删除任务时发生错误，请稍后重试。",
      });
    },
  });

  const query = useGetTasksSuspenseInfinite(
    {
      workspace_id: workspaceId,
    },
    {
      query: PAGINATED_QUERY_DEFAULT_OPTIONS,
    }
  );

  if (query.data.pages.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>暂无任务</EmptyTitle>
          <EmptyDescription>您还没有创建任何任务。</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <InfiniteScroll
          query={query}
          selectItems={(page) => page.items}
          itemRender={(task) => <TaskItem key={task.id} task={task} onDelete={asyncConfirm.trigger} />}
        />
      </ScrollArea>
      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={`确定要删除任务 "${asyncConfirm.pendingData?.title}" 吗？此操作无法撤销。`}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
