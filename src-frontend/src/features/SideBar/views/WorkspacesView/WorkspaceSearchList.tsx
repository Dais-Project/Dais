import { useMemo } from "react";
import type { WorkspaceBrief } from "@/api/generated/schemas";
import { useGetWorkspacesSuspenseInfinite } from "@/api/workspace";
import { InfiniteVirtualScroll } from "@/components/custom/InfiniteScroll";
import {
  PAGINATED_QUERY_DEFAULT_OPTIONS,
  SIDEBAR_QUERY_GC_TIME,
} from "@/constants/query-options";
import { WorkspaceItem } from "./WorkspaceItem";
import { SideBarSearchEmpty } from "../../components/SideBarSearchEmpty";

type WorkspaceSearchListProps = {
  searchQuery: string;
  disabled: boolean;
  onSelect: (workspaceId: number) => void;
  onDelete: (workspace: WorkspaceBrief) => void;
};

export function WorkspaceSearchList({
  searchQuery,
  disabled,
  onSelect,
  onDelete,
}: WorkspaceSearchListProps) {
  const query = useGetWorkspacesSuspenseInfinite(
    { query: searchQuery },
    {
      query: {
        ...PAGINATED_QUERY_DEFAULT_OPTIONS,
        gcTime: SIDEBAR_QUERY_GC_TIME,
      },
    },
  );
  const workspaces = useMemo(
    () => query.data.pages.flatMap((page) => page.items),
    [query.data.pages],
  );

  if (workspaces.length === 0) {
    return <SideBarSearchEmpty query={searchQuery} />;
  }

  return (
    <div className="flex h-full flex-col">
      <InfiniteVirtualScroll
        data={workspaces}
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
            onSelect={onSelect}
            onDelete={onDelete}
          />
        )}
      />
    </div>
  );
}
