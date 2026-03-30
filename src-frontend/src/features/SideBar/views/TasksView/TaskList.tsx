import { formatDistanceToNow } from "date-fns";
import { RefreshCwIcon, TrashIcon } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
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
import { useTabsStore } from "@/stores/tabs-store";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { useSettingsStore } from "@/stores/settings-store";
import { updateTaskTitle } from "@/features/resource/task-actions";
import { resolveIconName } from "@/lib/resolve-iconname";

function openTaskTab(task: TaskBrief) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find((t) => t.type === "task" && !t.metadata.isDraft && t.metadata.id === task.id);

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    addTab({
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
  onRegenerateTitle: (task: TaskBrief) => void;
  onDelete: (task: TaskBrief) => void;
};

function TaskItem({ task, onRegenerateTitle, onDelete }: TaskItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);

  return (
    <ActionableItem>
      <ActionableItemTrigger
        className="cursor-pointer"
        onClick={() => openTaskTab(task)}
      >
        <ActionableItemIcon>
          <DynamicIcon name={resolveIconName(task.icon_name, "box")} />
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
        <ActionableItemMenuItem onClick={() => onRegenerateTitle(task)}>
          <RefreshCwIcon />
          <span>{t("tasks.menu.regenerate_title")}</span>
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
      <ScrollArea className="limit-width h-full">
        <InfiniteScroll
          query={query}
          selectItems={(page) => page.items}
          itemRender={(task) => (
            <TaskItem
              key={task.id}
              task={task}
              onRegenerateTitle={handleRegenerateTitle}
              onDelete={asyncConfirm.trigger}
            />
          )}
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
