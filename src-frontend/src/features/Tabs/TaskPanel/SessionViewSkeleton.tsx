import { Skeleton } from "@/components/ui/skeleton";

export function SessionViewSkeleton() {
  return (
    <div className="flex h-full flex-col space-y-4 p-4 pt-0">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`flex flex-col ${i % 2 === 0 ? "items-start" : "items-end"} space-y-2`}
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton
              className={`h-20 ${i % 2 === 0 ? "w-2/3" : "w-1/2"} rounded-lg`}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="flex justify-end">
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
