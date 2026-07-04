import { useDebounceFn, useInViewport, useLatest } from "ahooks";
import { useEffect, useMemo, useRef } from "react";
import type {
  InfiniteData,
  UseSuspenseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useVirtualizer, type Virtualizer, type VirtualItem } from "@tanstack/react-virtual";
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

type InfiniteVirtualScrollProps<TItem, TPage> = {
  getItemKey: (item: TItem) => string | number;
  itemHeight: number;
  overscan?: number;
  gap?: number;
  paddingStart?: number;
  paddingEnd?: number;
  className?: string;
  listClassName?: string;
  itemRender: (props: {
    item: TItem,
    index: number,
    key: VirtualItem["key"],
    ref: Virtualizer<HTMLDivElement, Element>["measureElement"]
  }) => React.ReactNode;
} & (
    | {
      query: UseSuspenseInfiniteQueryResult<InfiniteData<TPage>>;
      selectItems: (page: TPage) => TItem[];
    }
    | {
      data: TItem[];
      fetchNextPage: () => void;
      hasNextPage: boolean;
      isFetchingNextPage: boolean;
    }
  );

export function InfiniteVirtualScroll<T, P>(props: InfiniteVirtualScrollProps<T, P>) {
  const { getItemKey, itemHeight, overscan = 3, paddingStart, paddingEnd, className, listClassName, itemRender } = props;
  const { dataItems, fetchNextPage, hasNextPage, isFetchingNextPage } = useMemo(() => {
    if ("query" in props) {
      const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = props.query;
      return {
        dataItems: data.pages.flatMap(props.selectItems),
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
      };
    } else {
      return {
        dataItems: props.data,
        fetchNextPage: props.fetchNextPage,
        hasNextPage: props.hasNextPage,
        isFetchingNextPage: props.isFetchingNextPage,
      };
    }
  }, [props]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const getItemKeyLatest = useLatest(getItemKey);

  const { run: handleScroll } = useDebounceFn((virtualizerInstance) => {
    const totalSize = virtualizerInstance.getTotalSize();
    const currentScroll = virtualizerInstance.scrollOffset;
    const containerSize = virtualizerInstance.scrollRect.height;

    const isAtBottomMargin = 100;
    const isAtBottom = Math.abs(currentScroll + containerSize - totalSize) < isAtBottomMargin;
    if (isAtBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, { wait: 100 });

  const virtualizer = useVirtualizer({
    count: dataItems.length,
    overscan: overscan,
    getItemKey(index) {
      const item = dataItems[index];
      return getItemKeyLatest.current(item);
    },
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemHeight,
    onChange: handleScroll,
    paddingStart,
    paddingEnd,
  });
  const vItems = virtualizer.getVirtualItems();

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
          className={listClassName}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${vItems[0]?.start ?? 0}px)`,
          }}
        >
          {vItems.map(
            (vItem) => (itemRender({
              item: dataItems[vItem.index],
              ref: virtualizer.measureElement,
              key: vItem.key,
              index: vItem.index,
            }))
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

