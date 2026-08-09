import { Skeleton } from "@/components/ui/skeleton";
import { TaskSessionViewSkeleton } from "../../Tabs/TaskPanel/views/TaskSessionView";

export function LayoutSkeleton() {
  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-layout-tabs-content">
      <header className="flex min-h-12 shrink-0 items-center gap-2 border-b bg-layout-tabs-bar px-2 pt-[env(safe-area-inset-top)]">
        <Skeleton className="size-10 shrink-0 rounded-md" />
        <Skeleton className="h-4 w-40 max-w-[60%]" />
      </header>
      <main className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
        <TaskSessionViewSkeleton />
      </main>
    </div>
  );
}
