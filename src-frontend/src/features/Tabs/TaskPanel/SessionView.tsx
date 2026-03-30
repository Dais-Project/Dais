import { useMount, useUnmount } from "ahooks";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContinueTask } from "./components/ContinueTask";
import { ErrorRetry } from "./components/ErrorRetry";
import { PromptInput, PromptInputProvider } from "./components/PromptInput";
import { TaskConversationContent, TaskConversationProvider, TaskConversationScrollToBottom } from "./components/TaskConversation";
import { useAgentTaskAction, useAgentTaskState } from "./hooks/use-agent-task";

export function SessionViewSkeleton() {
  return (
    <div className="h-full space-y-4 p-4 pt-0">
      <div className="mx-auto flex size-full max-w-3xl flex-col space-y-4">
        <div className="flex flex-1 flex-col space-y-2 overflow-y-hidden py-4">
          <Skeleton className="h-20 w-1/3 self-end rounded-lg" />
          <Skeleton className="h-40 w-3/4 self-start rounded-lg" />
          <Skeleton className="h-20 w-3/4 self-start rounded-lg" />
        </div>
        <Card className="w-full animate-pulse bg-accent/30">
          <CardContent className="space-y-2">
            <Skeleton className="h-6 w-full rounded-md" />
            <Skeleton className="h-6 max-w-64 rounded-md" />
          </CardContent>
          <CardFooter>
            <div className="flex w-full justify-between items-end">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="size-9 rounded-md" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

type SessionViewProps = {
  isUnmounted: boolean;
  workspaceId: number;
  shouldStartStream: boolean;
};

export function SessionView({
  isUnmounted,
  workspaceId,
  shouldStartStream,
}: SessionViewProps) {
  const { state } = useAgentTaskState();
  const { continue: continueTask, cancel: cancelTask } = useAgentTaskAction();

  useMount(() => {
    if (shouldStartStream) {
      continueTask();
    }
  });
  useUnmount(() => {
    if (!isUnmounted) {
      return;
    }
    cancelTask();
  });

  return (
    <TaskConversationProvider className="relative flex h-full flex-col">
      <TaskConversationContent />
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pointer-events-none">
        <div className="mx-auto w-full max-w-3xl">
          <TaskConversationScrollToBottom className="flex static mx-auto mb-2 pointer-events-auto" />
          <div className="w-7/8 mx-auto pointer-events-auto">
            {state === "idle" && <ContinueTask />}
            {state === "error" && <ErrorRetry />}
          </div>
          <PromptInputProvider>
            <PromptInput className="pointer-events-auto" workspaceId={workspaceId} />
          </PromptInputProvider>
        </div>
      </div>
    </TaskConversationProvider>
  );
}
