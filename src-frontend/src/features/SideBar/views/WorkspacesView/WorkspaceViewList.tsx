import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { WorkspaceBrief } from "@/api/generated/schemas";
import {
  useGetFrequentWorkspacesSuspense,
  useGetWorkspacesSuspenseInfinite,
} from "@/api/workspace";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { PAGINATED_QUERY_DEFAULT_OPTIONS, SIDEBAR_QUERY_GC_TIME } from "@/constants/query-options";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { WorkspaceItemVariant } from "./types";
import { WorkspaceItem } from "./WorkspaceItem";

type WorkspaceListItem = WorkspaceBrief & { variant: WorkspaceItemVariant };

function useWorkspaceListItems() {
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const frequentWorkspaces = useGetFrequentWorkspacesSuspense(
    { limit: 4 },
    { query: { gcTime: SIDEBAR_QUERY_GC_TIME } },
  );
  const allWorkspacesQuery = useGetWorkspacesSuspenseInfinite(undefined, {
    query: {
      ...PAGINATED_QUERY_DEFAULT_OPTIONS,
      gcTime: SIDEBAR_QUERY_GC_TIME,
    },
  },
  );
  const allWorkspaces = useMemo(() =>
    allWorkspacesQuery.data.pages.flatMap(
      (page) => page.items,
    ), [allWorkspacesQuery.data]);
  const [frequentItems, frequentWorkspaceIds] = useMemo(() => {
    const items = frequentWorkspaces.data
      .filter((workspace) => workspace.id !== currentWorkspace?.id)
      .slice(0, 3)
      .map((workspace) => ({
        ...workspace,
        variant: "frequent",
      } satisfies WorkspaceListItem));
    const ids = new Set(items.map((item) => item.id));
    return [items, ids];
  }, [currentWorkspace, frequentWorkspaces.data]);

  const otherItems = useMemo(() => {
    return allWorkspaces
      .filter((workspace) => {
        const isCurrentWorkspace = workspace.id === currentWorkspace?.id;
        return isCurrentWorkspace
          ? false
          : !frequentWorkspaceIds.has(workspace.id);
      })
      .map((workspace) => ({
        ...workspace,
        variant: "default",
      } satisfies WorkspaceListItem));
  }, [currentWorkspace, frequentWorkspaceIds, allWorkspaces]);

  const items = useMemo(() =>
    [...frequentItems, ...otherItems],
    [frequentItems, otherItems]);

  return {
    items,
    query: allWorkspacesQuery,
  };
}

type WorkspaceDefaultListProps = {
  currentWorkspace: WorkspaceBrief | null;
  disabled: boolean;
  onSelect: (workspaceId: number) => void;
  onDelete: (workspace: WorkspaceBrief) => void;
};

export function WorkspaceViewList({
  currentWorkspace,
  disabled,
  onSelect,
  onDelete,
}: WorkspaceDefaultListProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { items, query } = useWorkspaceListItems();

  if (items.length === 0 && !currentWorkspace) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>{t("workspaces.empty.title")}</EmptyTitle>
          <EmptyDescription>
            {t("workspaces.empty.description")}
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {currentWorkspace && (
        <div className="shrink-0">
          <WorkspaceItem
            workspace={currentWorkspace}
            disabled={disabled}
            variant="current"
            onSelect={onSelect}
            onDelete={onDelete}
          />
        </div>
      )}

      <InfiniteVirtualScroll
        data={items}
        fetchNextPage={() => query.fetchNextPage()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        className="min-h-0 flex-1"
        getItemKey={(item) => item.id}
        itemHeight={69}
        overscan={3}
        itemRender={({ item, key, index, ref }) => (
          <WorkspaceItem
            key={key}
            workspace={item}
            ref={ref}
            index={index}
            disabled={disabled}
            variant={item.variant}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        )}
      />
    </div>
  );
}
