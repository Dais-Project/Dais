import type {
  InfiniteData,
  UseSuspenseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useInViewport } from "ahooks";
import { useEffect, useMemo, useRef } from "react";

type InfiniteScrollProps<TItem, TPage> = {
  query: UseSuspenseInfiniteQueryResult<InfiniteData<TPage>>;
  selectItems: (page: TPage) => TItem[];
  itemRender: (item: TItem, index: number) => React.ReactNode;
};

export function InfiniteScroll<T, P>({
  query,
  selectItems,
  itemRender,
}: InfiniteScrollProps<T, P>) {
  const ref = useRef<HTMLDivElement>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const [isAtBottom] = useInViewport(ref, {
    rootMargin: "100px",
  });

  const items = useMemo(() => {
    return data.pages.flatMap(selectItems);
  }, [data.pages, selectItems]);

  useEffect(() => {
    if (isAtBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isAtBottom, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      {items.map(itemRender)}
      <div ref={ref} className="h-1" />
    </>
  );
}
