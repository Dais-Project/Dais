import { formatDistanceToNow } from "date-fns";
import { DynamicIcon } from "lucide-react/dynamic";
import { useTranslation } from "react-i18next";
import type { TaskBrief } from "@/api/generated/schemas";
import { useGetTasksSuspenseInfinite } from "@/api/tasks";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import { ActionableItemInfo } from "@/components/custom/item/ActionableItem";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  PAGINATED_QUERY_DEFAULT_OPTIONS,
  SIDEBAR_QUERY_GC_TIME,
} from "@/constants/query-options";
import { openTaskTab } from "@/features/SideBar/views/TasksView/shared";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { resolveIconName } from "@/lib/resolve-iconname";
import { useSettingsStore } from "@/stores/settings-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useNavigationDrawer } from "./NavigationDrawerContext";
import { NavigationListItem } from "./components/NavigationListItem";

type TaskItemProps = {
  task: TaskBrief;
  index: number;
  ref: React.Ref<HTMLButtonElement>;
  workspaceId: number;
};

function TaskItem({ task, index, ref, workspaceId }: TaskItemProps) {
  const { close: closeDrawer } = useNavigationDrawer();
  const { language } = useSettingsStore((state) => state.current);

  return (
    <NavigationListItem
      ref={ref}
      index={index}
      icon={<DynamicIcon name={resolveIconName(task.icon_name, "box")} />}
      onClick={() => {
        openTaskTab(workspaceId, task);
        closeDrawer();
      }}
    >
      <ActionableItemInfo
        title={task.title}
        description={formatDistanceToNow(
          new Date(task.last_run_at * 1000),
          {
            addSuffix: true,
            locale: DATEFNS_LOCALE_MAP[language],
          },
        )}
      />
    </NavigationListItem>
  );
}

function WorkspaceTaskList({ workspaceId }: { workspaceId: number }) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const query = useGetTasksSuspenseInfinite(
    { workspace_id: workspaceId },
    {
      query: {
        ...PAGINATED_QUERY_DEFAULT_OPTIONS,
        gcTime: SIDEBAR_QUERY_GC_TIME,
      },
    },
  );

  if (query.data.pages.flatMap((page) => page.items).length === 0) {
    return (
      <Empty className="h-full rounded-none">
        <EmptyContent>
          <EmptyTitle>{t("tasks.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("tasks.empty.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <InfiniteVirtualScroll
      query={query}
      selectItems={(page) => page.items}
      getItemKey={(task) => task.id}
      itemHeight={69}
      overscan={3}
      itemRender={({ item, key, index, ref }) => (
        <TaskItem
          key={key}
          ref={ref}
          task={item}
          index={index}
          workspaceId={workspaceId}
        />
      )}
    />
  );
}

export function WorkspaceTasks() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  if (currentWorkspace === null) {
    return (
      <Empty className="h-full rounded-none">
        <EmptyContent>
          <EmptyTitle>{t("tasks.empty.no_workspace.title")}</EmptyTitle>
          <EmptyDescription>
            {t("tasks.empty.no_workspace.description")}
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return <WorkspaceTaskList workspaceId={currentWorkspace.id} />;
}
