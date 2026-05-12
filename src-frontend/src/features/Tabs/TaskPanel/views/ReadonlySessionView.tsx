import { Skeleton } from "@/components/ui/skeleton";
import { TaskConversationContent, TaskConversationProvider, TaskConversationScrollToBottom } from "../components/TaskConversation";
import { CollapsibleStoreProvider } from "../hooks/use-collapsible-store";

export function ReadonlySessionViewSkeleton() {
  return (
    <div className="flex flex-1 flex-col space-y-2 overflow-y-hidden p-4">
      <Skeleton className="h-20 w-1/3 self-end rounded-lg" />
      <Skeleton className="h-40 w-3/4 self-start rounded-lg" />
      <Skeleton className="h-20 w-3/4 self-start rounded-lg" />
    </div>
  );
}

export function ReadonlySessionView() {
  return (
    <CollapsibleStoreProvider>
      <TaskConversationProvider className="relative flex h-full flex-col" data-task-conversation>
        <TaskConversationContent />
        <TaskConversationScrollToBottom />
      </TaskConversationProvider>
    </CollapsibleStoreProvider>
  );
}
