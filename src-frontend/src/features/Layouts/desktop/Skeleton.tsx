import { Skeleton } from "@/components/ui/skeleton";
import { TaskSessionViewSkeleton } from "../../Tabs/TaskPanel/views/TaskSessionView";
import { SideBarListSkeleton } from "../../SideBar/components/SideBarListSkeleton";

function SideBarSkeleton() {
  return (
    <div className="h-full w-[320px] shrink-0 bg-layout-sidebar hidden sm:block">
      <div className="border-b p-3">
        <Skeleton className="h-8 w-full rounded-none" />
      </div>
      <div className="space-y-1 p-2">
        <SideBarListSkeleton />
      </div>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-layout-tabs-content">
      <div className="flex h-10 items-center gap-2 border-b bg-layout-tabs-bar px-2">
        <Skeleton className="h-6 w-32 rounded-none" />
        <Skeleton className="h-6 w-28 rounded-none" />
        <Skeleton className="h-6 w-40 rounded-none" />
      </div>
      <div className="flex-1 p-4">
        <TaskSessionViewSkeleton />
      </div>
    </div>
  );
}

export function LayoutSkeleton() {
  return (
    <div className="flex h-full">
      {/* ActivityBarSkeleton */}
      <Skeleton className="w-12 h-full animate-none rounded-none" />

      <div className="flex h-full min-w-0 flex-1">
        <SideBarSkeleton />
        <div className="w-px bg-border" />
        <TabsSkeleton />
      </div>
    </div>
  );
}
