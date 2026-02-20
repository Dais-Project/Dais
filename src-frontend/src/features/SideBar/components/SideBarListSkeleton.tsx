import { Item, ItemContent, ItemMedia } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

export function SideBarListSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <Item key={`skeleton-${index}`} className="rounded-none border-x-0 border-t-0" variant="outline" size="sm">
          <ItemMedia variant="icon">
            <Skeleton className="size-4" />
          </ItemMedia>
          <ItemContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </ItemContent>
        </Item>
      ))}
    </>
  );
}
