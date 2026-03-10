import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { PencilIcon, TrashIcon } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { produce } from "immer";
import { toast } from "sonner";
import { DynamicIcon, IconName } from "lucide-react/dynamic";
import type { PageTaskBrief, TaskBrief, TaskTitleUpdatedEvent } from "@/api/generated/schemas";
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
import SseDispatcher from "@/lib/sse-dispatcher";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { useSettingsStore } from "@/stores/settings-store";

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
  const removeTabs = useTabsStore.getState().remove;
  removeTabs((tab) => (tab.type === "task" &&
                       !tab.metadata.isDraft &&
                       tab.metadata.id === taskId));
}

type TaskItemProps = {
  task: TaskBrief;
  onDelete: (task: TaskBrief) => void;
};

function TaskItem({ task, onDelete }: TaskItemProps) {
  const { t } = useTranslation("sidebar");
  const { language } = useSettingsStore((state) => state.current);

  const handleClick = () => {
    openTaskTab(task);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(t("tasks.toast.rename_feature_title"), {
      description: t("tasks.toast.rename_feature_description"),
    });
  };

  return (
    <ActionableItem>
      <ActionableItemTrigger className="cursor-pointer" onClick={handleClick}>
        <ActionableItemIcon>
          <DynamicIcon name={task.icon_name as IconName} />
        </ActionableItemIcon>
        <ActionableItemInfo
          title={task.title}
          description={formatDistanceToNow(new Date(task.last_run_at * 1000), {
            addSuffix: true,
            locale: DATEFNS_LOCALE_MAP[language],
          })}
        />
      </ActionableItemTrigger>

      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleRename}>
          <PencilIcon />
          <span>{t("tasks.menu.rename")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem variant="destructive" onClick={() => onDelete(task)}>
          <TrashIcon />
          <span>{t("tasks.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

type TaskListProps = {
  workspaceId: number;
};

export function TaskList({ workspaceId }: TaskListProps) {
  const { t } = useTranslation("sidebar");
  const queryClient = useQueryClient();
  const deleteTaskMutation = useDeleteTask();

  useEffect(() => 
    SseDispatcher.subscribe("TASK_TITLE_UPDATED", ({ task_id, title }: TaskTitleUpdatedEvent) => {
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
      toast.success(t("tasks.toast.delete_success_title"), {
        description: t("tasks.toast.delete_success_description"),
      });
    },
    onError(error: Error) {
      toast.error(t("tasks.toast.delete_error_title"), {
        description: error.message || t("tasks.toast.delete_error_description"),
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
          <EmptyTitle>{t("tasks.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("tasks.empty.description")}</EmptyDescription>
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
