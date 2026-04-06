import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FailedToLoad } from "@/components/custom/FailedToLoad";

function TabPanelFrameSkeleton() {
  return (
    <div className="flex h-full flex-col gap-y-8 px-8 py-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-18" />
        <Skeleton className="h-8 w-52" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-72" />
      </div>

      <div className="flex items-center justify-end gap-x-2">
        <Skeleton className="h-8 w-18" />
        <Skeleton className="h-8 w-18" />
      </div>
    </div>
  );
}

type TabPanelFrameProps = {
  children: React.ReactNode;
};

export function TabPanelFrame({ children }: TabPanelFrameProps) {
  return (
    <AsyncBoundary
      skeleton={<TabPanelFrameSkeleton />}
      errorRender={(props) => (
        <div className="flex h-full items-center justify-center p-4">
          <FailedToLoad error={props.error} retry={props.resetErrorBoundary} />
        </div>
      )}
    >
      <ScrollArea className="h-full px-8">{children}</ScrollArea>
    </AsyncBoundary>
  );
}
