import type { AnyUseInfiniteQueryOptions } from "@tanstack/react-query";

type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
};

export const PAGINATED_QUERY_DEFAULT_OPTIONS = {
  initialPageParam: 1,
  getNextPageParam: (lastPage: PaginatedData<unknown>) => {
    if (lastPage.page < lastPage.pages) {
      return lastPage.page + 1;
    }
    return undefined;
  },
} satisfies Partial<AnyUseInfiniteQueryOptions>;
