import { ChevronsUpDownIcon, FolderIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { WorkspaceBrief } from "@/api/generated/schemas";
import {
  useGetFrequentWorkspacesSuspense,
  useGetWorkspacesSuspenseInfinite,
} from "@/api/workspace";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import { ActionableItemInfo } from "@/components/custom/item/ActionableItem";
import {
  Drawer,
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
import {
  PAGINATED_QUERY_DEFAULT_OPTIONS,
  SIDEBAR_QUERY_GC_TIME,
} from "@/constants/query-options";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { NavigationListItem } from "./components/NavigationListItem";
import { WorkspaceItemVariant } from "@/features/SideBar/views/WorkspacesView/types";
import { WorkspaceIcon } from "@/features/SideBar/views/WorkspacesView/WorkspaceIcon";
import { NavigationListSkeleton } from "./components/NavigationListSkeleton";

type WorkspaceListItem = WorkspaceBrief & { variant: WorkspaceItemVariant };

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
  const isDisabled = disabled || variant === "current";

  return (
    <NavigationListItem
      icon={<WorkspaceIcon variant={variant} />}
      disabled={isDisabled}
      onClick={() => onSelect(workspace.id)}
    >
      <ActionableItemInfo
        title={workspace.name}
        description={workspace.directory}
      />
    </NavigationListItem>
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
        itemHeight={69}
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

export function WorkspaceSelectDrawer() {
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
        <AsyncBoundary skeleton={<NavigationListSkeleton />}>
          <WorkspaceSelectionList onSelected={() => setIsOpen(false)} />
        </AsyncBoundary>
      </DrawerContent>
    </Drawer>
  );
}
