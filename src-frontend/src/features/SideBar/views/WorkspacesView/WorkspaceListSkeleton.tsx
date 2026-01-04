import { Item, ItemContent, ItemMedia } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <Item
          key={`workspace-skeleton-${Date.now()}-${index}`}
          variant="outline"
          size="sm"
        >
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
    </div>
  );
}
