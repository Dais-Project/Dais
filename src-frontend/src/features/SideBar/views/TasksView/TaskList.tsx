import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { PencilIcon, TrashIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { deleteTask, fetchTasks } from "@/api/task";
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
import type { TaskRead } from "@/types/task";
import { TaskIcon } from "./TaskIcon";

type TaskItemProps = {
  task: TaskRead;
  onClick: (taskId: number) => void;
  onRename: (task: TaskRead) => void;
  onDelete: (task: TaskRead) => void;
};

function TaskItem({ task, onClick, onRename, onDelete }: TaskItemProps) {
  const handleClick = () => {
    onClick(task.id);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRename(task);
  };

  return (
    <ActionableItem>
      <ActionableItemTrigger onClick={handleClick}>
        <ActionableItemIcon variant="icon">
          <TaskIcon taskType={task.type} className="size-4" />
        </ActionableItemIcon>
        <ActionableItemInfo title={task.title} />
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
  (prevProps, nextProps) => prevProps.task.id === nextProps.task.id
);

type TaskListProps = {
  workspaceId: number;
};

export function TaskList({ workspaceId }: TaskListProps) {
  const queryClient = useQueryClient();
  const { addTab, tabs, setActiveTab, removeTab } = useTabsStore();

  const asyncConfirm = useAsyncConfirm<TaskRead>({
    onConfirm: async (task) => {
      await deleteTaskMutation.mutateAsync(task.id);
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });

      const tabsToRemove = tabs.filter(
        (tab) =>
          tab.type === "task" &&
          !tab.metadata.isDraft &&
          tab.metadata.id === task.id
      );

      for (const tab of tabsToRemove) {
        removeTab(tab.id);
      }

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

  const { data } = useSuspenseQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: async () => await fetchTasks(workspaceId),
  });

  const deleteTaskMutation = useMutation({ mutationFn: deleteTask });

  const handleOpenTask = (taskId: number) => {
    const task = data.items.find((t) => t.id === taskId);
    if (!task) {
      return;
    }

    const existingTab = tabs.find(
      (t) =>
        t.type === "task" && !t.metadata.isDraft && t.metadata.id === taskId
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
  };

  const handleRenameTask = (_task: TaskRead) => {
    // TODO: 实现重命名功能
    toast.info("重命名功能", {
      description: "重命名功能待实现",
    });
  };

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
            onClick={handleOpenTask}
            onRename={handleRenameTask}
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
