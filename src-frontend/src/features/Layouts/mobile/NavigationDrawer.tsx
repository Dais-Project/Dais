import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  BotIcon,
  ChevronsUpDownIcon,
  Clock3Icon,
  FolderIcon,
} from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { TaskBrief, WorkspaceBrief } from "@/api/generated/schemas";
import { useGetTasksSuspenseInfinite } from "@/api/tasks";
import {
  useGetFrequentWorkspacesSuspense,
  useGetWorkspacesSuspenseInfinite,
} from "@/api/workspace";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PAGINATED_QUERY_DEFAULT_OPTIONS,
  SIDEBAR_QUERY_GC_TIME,
} from "@/constants/query-options";
import { openTaskTab } from "@/features/SideBar/views/TasksView/shared";
import { DATEFNS_LOCALE_MAP } from "@/i18n/locale-maps/datefns";
import { SIDEBAR_NAMESPACE, TABS_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";
import { resolveIconName } from "@/lib/resolve-iconname";
import { useSettingsStore } from "@/stores/settings-store";
import {
  type StoredTab,
  type TabIndicator,
  useTabsStore,
} from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

type NavigationView = "open" | "workspace-tasks";
type WorkspaceItemVariant = "current" | "frequent" | "default";
type WorkspaceListItem = WorkspaceBrief & { variant: WorkspaceItemVariant };

const TAB_INDICATOR_CLASS_MAP: Record<TabIndicator, string> = {
  "in-progress": "bg-info animate-pulse",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

function MobileListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="flex min-h-14 items-center gap-3 px-3" key={index}>
          <Skeleton className="size-5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskTabIcon({ tab }: { tab: StoredTab }) {
  if (tab.icon) {
    return <DynamicIcon name={tab.icon} className="size-5" />;
  }
  return <BotIcon className="size-5" />;
}

function OpenTaskTabs() {
  const { t } = useTranslation(TABS_NAMESPACE);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const indicators = useTabsStore((state) => state.indicators);
  const setActiveTab = useTabsStore((state) => state.setActive);
  const taskTabs = useMemo(
    () =>
      tabs
        .filter((tab) => tab.type === "task")
        .sort((a, b) => a.createdAt - b.createdAt),
    [tabs],
  );

  if (taskTabs.length === 0) {
    return (
      <Empty className="h-full rounded-none">
        <EmptyContent>
          <EmptyTitle>{t("tabs.empty.no_tabs_open")}</EmptyTitle>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2">
      {taskTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const indicator = indicators[tab.id] ?? null;
        return (
          <DrawerClose asChild key={tab.id}>
            <button
              id={`mobile-tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground active:bg-accent/70",
              )}
            >
              <span className="relative shrink-0">
                <TaskTabIcon tab={tab} />
                {indicator !== null && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-0 bottom-0 size-2 translate-x-1/4 translate-y-1/4 rounded-full border border-background",
                      TAB_INDICATOR_CLASS_MAP[indicator],
                    )}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {tab.title}
              </span>
            </button>
          </DrawerClose>
        );
      })}
    </div>
  );
}

function MobileTaskItem({
  task,
  index,
  ref,
  isActive,
  isOpen,
  workspaceId,
}: {
  task: TaskBrief;
  index: number;
  ref: React.Ref<HTMLButtonElement>;
  isActive: boolean;
  isOpen: boolean;
  workspaceId: number;
}) {
  const { language } = useSettingsStore((state) => state.current);

  return (
    <DrawerClose asChild>
      <button
        ref={ref}
        type="button"
        data-index={index}
        onClick={() => openTaskTab(workspaceId, task)}
        className={cn(
          "flex min-h-17 w-full items-center gap-3 border-b px-3 py-2 text-left active:bg-accent/70",
          isActive && "bg-accent text-accent-foreground",
          isOpen && !isActive && "bg-muted/60",
        )}
      >
        <DynamicIcon
          name={resolveIconName(task.icon_name, "box")}
          className="size-5 shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-sm">{task.title}</span>
          <span className="block truncate text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(task.last_run_at * 1000), {
              addSuffix: true,
              locale: DATEFNS_LOCALE_MAP[language],
            })}
          </span>
        </span>
      </button>
    </DrawerClose>
  );
}

function WorkspaceTaskList({ workspaceId }: { workspaceId: number }) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const query = useGetTasksSuspenseInfinite(
    { workspace_id: workspaceId },
    {
      query: {
        ...PAGINATED_QUERY_DEFAULT_OPTIONS,
        gcTime: SIDEBAR_QUERY_GC_TIME,
      },
    },
  );
  const openedTaskTabs = useMemo(
    () =>
      tabs.filter(
        (tab) =>
          tab.type === "task" &&
          tab.metadata.type === "task" &&
          !tab.metadata.isDraft &&
          tab.metadata.workspace_id === workspaceId,
      ),
    [tabs, workspaceId],
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
      itemHeight={68}
      overscan={3}
      itemRender={({ item, key, index, ref }) => {
        const openedTab = openedTaskTabs.find(
          (tab) =>
            tab.metadata.type === "task" &&
            !tab.metadata.isDraft &&
            tab.metadata.id === item.id,
        );
        return (
          <MobileTaskItem
            key={key}
            ref={ref}
            task={item}
            index={index}
            workspaceId={workspaceId}
            isOpen={openedTab !== undefined}
            isActive={openedTab?.id === activeTabId}
          />
        );
      }}
    />
  );
}

function WorkspaceTasks() {
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

function WorkspaceIcon({ variant }: { variant: WorkspaceItemVariant }) {
  if (variant === "frequent") {
    return <Clock3Icon className="size-5" />;
  }
  return (
    <FolderIcon
      className="size-5"
      fill={variant === "current" ? "currentColor" : "none"}
    />
  );
}

function WorkspaceOption({
  workspace,
  variant,
  disabled,
  onSelect,
}: {
  workspace: WorkspaceBrief;
  variant: WorkspaceItemVariant;
  disabled: boolean;
  onSelect: (workspaceId: number) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || variant === "current"}
      onClick={() => onSelect(workspace.id)}
      className={cn(
        "flex min-h-16 w-full items-center gap-3 border-b px-4 py-2 text-left active:bg-accent/70 disabled:opacity-60",
        variant === "current" && "bg-accent text-accent-foreground",
      )}
    >
      <WorkspaceIcon variant={variant} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-sm">
          {workspace.name}
        </span>
        <span className="block truncate text-muted-foreground text-xs">
          {workspace.directory}
        </span>
      </span>
    </button>
  );
}

function WorkspaceSelectionList({ onSelected }: { onSelected: () => void }) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrent);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const frequentWorkspaces = useGetFrequentWorkspacesSuspense(
    { limit: 4 },
    { query: { gcTime: SIDEBAR_QUERY_GC_TIME } },
  );
  const allWorkspacesQuery = useGetWorkspacesSuspenseInfinite(undefined, {
    query: {
      ...PAGINATED_QUERY_DEFAULT_OPTIONS,
      gcTime: SIDEBAR_QUERY_GC_TIME,
    },
  });
  const workspaceListItems = useMemo<WorkspaceListItem[]>(() => {
    const frequentItems = frequentWorkspaces.data
      .filter((workspace) => workspace.id !== currentWorkspace?.id)
      .slice(0, 3)
      .map((workspace) => ({ ...workspace, variant: "frequent" as const }));
    const frequentIds = new Set(frequentItems.map((workspace) => workspace.id));
    const otherItems = allWorkspacesQuery.data.pages
      .flatMap((page) => page.items)
      .filter(
        (workspace) =>
          workspace.id !== currentWorkspace?.id &&
          !frequentIds.has(workspace.id),
      )
      .map((workspace) => ({ ...workspace, variant: "default" as const }));
    return [...frequentItems, ...otherItems];
  }, [
    allWorkspacesQuery.data.pages,
    currentWorkspace?.id,
    frequentWorkspaces.data,
  ]);

  async function handleSelect(workspaceId: number) {
    try {
      await setCurrentWorkspace(workspaceId);
      onSelected();
    } catch {
      toast.error(t("mobile.workspace_select_error"));
    }
  }

  if (workspaceListItems.length === 0 && currentWorkspace === null) {
    return (
      <Empty className="h-full rounded-none">
        <EmptyContent>
          <EmptyTitle>{t("workspaces.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("workspaces.empty.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {currentWorkspace && (
        <WorkspaceOption
          workspace={currentWorkspace}
          variant="current"
          disabled={isLoading}
          onSelect={handleSelect}
        />
      )}
      <InfiniteVirtualScroll
        data={workspaceListItems}
        fetchNextPage={() => allWorkspacesQuery.fetchNextPage()}
        hasNextPage={allWorkspacesQuery.hasNextPage}
        isFetchingNextPage={allWorkspacesQuery.isFetchingNextPage}
        className="min-h-0 flex-1"
        getItemKey={(workspace) => workspace.id}
        itemHeight={64}
        overscan={3}
        itemRender={({ item, key, index, ref }) => (
          <div key={key} ref={ref} data-index={index}>
            <WorkspaceOption
              workspace={item}
              variant={item.variant}
              disabled={isLoading}
              onSelect={handleSelect}
            />
          </div>
        )}
      />
    </div>
  );
}

function WorkspaceSelector() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer nested open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex min-h-[calc(3.5rem+env(safe-area-inset-bottom))] w-full items-center gap-3 border-t px-4 pb-[env(safe-area-inset-bottom)] text-left active:bg-accent/70"
        >
          <FolderIcon className="size-5 shrink-0" fill="currentColor" />
          <span className="min-w-0 flex-1 truncate font-medium text-sm">
            {currentWorkspace?.name ?? t("tasks.empty.no_workspace.title")}
          </span>
          <ChevronsUpDownIcon className="size-5 shrink-0 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="h-[min(80vh,44rem)] pb-[env(safe-area-inset-bottom)]">
        <DrawerHeader className="shrink-0 text-left">
          <DrawerTitle>{t("mobile.select_workspace")}</DrawerTitle>
        </DrawerHeader>
        <AsyncBoundary skeleton={<MobileListSkeleton />}>
          <WorkspaceSelectionList onSelected={() => setIsOpen(false)} />
        </AsyncBoundary>
      </DrawerContent>
    </Drawer>
  );
}

export function MobileNavigationDrawer() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [view, setView] = useState<NavigationView>("open");

  return (
    <DrawerContent className="w-[min(88vw,360px)]! max-w-[360px]!">
      <DrawerHeader className="sr-only">
        <DrawerTitle>{t("mobile.navigation")}</DrawerTitle>
      </DrawerHeader>
      <div className="grid shrink-0 grid-cols-2 border-b pt-[env(safe-area-inset-top)]">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setView("open")}
          className={cn(
            "min-h-11 rounded-none border-r",
            view === "open" && "bg-accent text-accent-foreground",
          )}
        >
          {t("mobile.opened")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setView("workspace-tasks")}
          className={cn(
            "min-h-11 rounded-none",
            view === "workspace-tasks" && "bg-accent text-accent-foreground",
          )}
        >
          {t("mobile.workspace_tasks")}
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {view === "open" ? (
          <OpenTaskTabs />
        ) : (
          <AsyncBoundary skeleton={<MobileListSkeleton />}>
            <WorkspaceTasks />
          </AsyncBoundary>
        )}
      </div>
      <WorkspaceSelector />
    </DrawerContent>
  );
}
