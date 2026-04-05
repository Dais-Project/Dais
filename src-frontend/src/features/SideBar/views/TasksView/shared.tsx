import { formatDistanceToNow } from "date-fns";
import { RefreshCwIcon, TrashIcon } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { useTranslation } from "react-i18next";
import type { TaskBrief } from "@/api/generated/schemas";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabsStore } from "@/stores/tabs-store";
import { resolveIconName } from "@/lib/resolve-iconname";

export function openTaskTab(workspaceId: number, task: TaskBrief) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find((t) => t.type === "task" && !t.metadata.isDraft && t.metadata.id === task.id);

  if (existingTab) {
    setActiveTab(existingTab.id);
    return;
  }

  addTab({
    title: task.title,
    type: "task",
    metadata: {
      isDraft: false,
      id: task.id,
      workspace_id: workspaceId,
    },
  });
}

export function removeTaskTab(taskId: number) {
  const removeTabs = useTabsStore.getState().remove;
  removeTabs((tab) => (
    tab.type === "task" &&
    !tab.metadata.isDraft &&
    tab.metadata.id === taskId
  ));
}

type TaskItemProps = {
  task: TaskBrief;
  index: number;
  ref: React.Ref<HTMLDivElement>;
  onRegenerateTitle: (task: TaskBrief) => void;
  onOpen: (task: TaskBrief) => void;
  onDelete: (task: TaskBrief) => void;
};

export function TaskItem({
  task,
  index,
  ref,
  onOpen,
  onDelete,
  onRegenerateTitle,
}: TaskItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { language } = useSettingsStore((state) => state.current);

  return (
    <ActionableItem>
      <ActionableItemTrigger
        ref={ref}
        className="cursor-pointer"
        onClick={() => onOpen(task)}
        data-index={index}
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
