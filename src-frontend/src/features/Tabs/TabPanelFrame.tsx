import type { FallbackProps } from "react-error-boundary";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

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
  errorRender: (props: FallbackProps) => React.ReactNode;
};

export function TabPanelFrame({ children, errorRender }: TabPanelFrameProps) {
  return (
    <AsyncBoundary
      skeleton={<TabPanelFrameSkeleton />}
      errorRender={errorRender}
    >
      <ScrollArea className="h-full px-8">{children}</ScrollArea>
    </AsyncBoundary>
  );
}
