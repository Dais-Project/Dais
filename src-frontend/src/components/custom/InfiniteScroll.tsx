import { useInViewport, useThrottleFn } from "ahooks";
import { useEffect, useMemo, useRef } from "react";
import type {
  InfiniteData,
  UseSuspenseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";

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

type InfiniteVirtualScrollProps<T, P> = InfiniteScrollProps<T, P> & {
  itemHeight: number,
  overscan?: number,
  className?: string,
};

export function InfiniteVirtualScroll<T, P>({
  query,
  itemHeight,
  overscan = 3,
  className,
  selectItems,
  itemRender,
}: InfiniteVirtualScrollProps<T, P>) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dataItems = useMemo(() => {
    return data.pages.flatMap(selectItems);
  }, [data.pages, selectItems]);

  const virtualizer = useVirtualizer({
    count: hasNextPage ? dataItems.length + 1 : dataItems.length,
    overscan: overscan,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemHeight,
  });

  const vItems = virtualizer.getVirtualItems();

  const { run: scrollHandler } = useThrottleFn(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const distance =
      scrollEl.scrollHeight -
      scrollEl.scrollTop -
      scrollEl.clientHeight;

    const isAtBottom = distance < 2;
    if (isAtBottom && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, { wait: 100 });

  useEffect(() => {
    const scrollEl = virtualizer.scrollElement;
    if (!scrollEl) return;
    scrollHandler();
    scrollEl.addEventListener("scroll", scrollHandler);
    return () => scrollEl.removeEventListener("scroll", scrollHandler);
  }, [virtualizer]);

  return (
    <ScrollArea
      className={cn("size-full", className)}
      viewportRef={scrollRef}
      viewportClassName="[overflow-anchor:none]"
      data-virtual-scroll
    >
      <div
        className="relative contain-strict"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        data-virtual-relative
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${vItems[0]?.start ?? 0}px)`,
          }}
        >
          {vItems.map((vItem) => {
            const itemData = dataItems[vItem.index];
            return (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
              >
                {itemRender(itemData, vItem.index)}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

