import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { PencilIcon, TrashIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import type { TaskRead } from "@/api/generated/schemas";
import {
  getGetTaskQueryKey,
  getGetTasksQueryKey,
  useDeleteTask,
  useGetTasksSuspense,
} from "@/api/task";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { TaskIcon } from "./TaskIcon";

function openTaskTab(task: TaskRead) {
  const { tabs, addTab, setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (t) => t.type === "task" && !t.metadata.isDraft && t.metadata.id === task.id
  );

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
        type: task.type,
      },
    });
  }
}

function removeTaskTab(taskId: number) {
  const { tabs, removeTab } = useTabsStore.getState();
  const tabsToRemove = tabs.filter(
    (tab) =>
      tab.type === "task" && !tab.metadata.isDraft && tab.metadata.id === taskId
  );

  for (const tab of tabsToRemove) {
    removeTab(tab.id);
  }
}

type TaskItemProps = {
  task: TaskRead;
  onDelete: (task: TaskRead) => void;
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
          <TaskIcon taskType={task.type} className="size-4" />
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
        <ActionableItemMenuItem
          className="text-destructive"
          onClick={() => onDelete(task)}
        >
          <TrashIcon className="mr-2 size-4" />
          <span>删除任务</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

const MemoizedTaskItem = React.memo(
  TaskItem,
  (prev, next) =>
    prev.task.id === next.task.id &&
    prev.task.title === next.task.title &&
    prev.task.last_run_at === next.task.last_run_at
);

type TaskListProps = {
  workspaceId: number;
};

export function TaskList({ workspaceId }: TaskListProps) {
  const queryClient = useQueryClient();
  const deleteTaskMutation = useDeleteTask();

  const asyncConfirm = useAsyncConfirm<TaskRead>({
    onConfirm: async (task) => {
      await deleteTaskMutation.mutateAsync({ taskId: task.id });
      queryClient.invalidateQueries({
        queryKey: getGetTasksQueryKey({ workspace_id: workspaceId }),
      });
      queryClient.removeQueries({
        queryKey: getGetTaskQueryKey(task.id),
      });
      removeTaskTab(task.id);
      toast.success("删除成功", {
        description: "已成功删除任务。",
      });
    },
    onError: (error: Error) => {
      toast.error("删除失败", {
        description: error.message || "删除任务时发生错误，请稍后重试。",
      });
    },
  });

  const { data } = useGetTasksSuspense({
    workspace_id: workspaceId,
    page: 1,
    per_page: 15,
  });

  if (data.items.length === 0) {
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
        {data.items.map((task) => (
          <MemoizedTaskItem
            key={task.id}
            task={task}
            onDelete={asyncConfirm.trigger}
          />
        ))}
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
