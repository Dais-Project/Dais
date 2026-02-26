import { useMount } from "ahooks";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContinueTask } from "./components/ContinueTask";
import { ErrorRetry } from "./components/ErrorRetry";
import { PromptInput, PromptInputProvider } from "./components/PromptInput";
import { TaskConversation } from "./components/TaskConversation";
import { useAgentTaskAction, useAgentTaskState } from "./hooks/use-agent-task";

export function SessionViewSkeleton() {
  return (
    <div className="flex h-full flex-col space-y-4 p-4 pt-0">
      <div className="mx-auto flex w-full max-w-3xl flex-col space-y-4">
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
            <div className="flex w-full justify-between">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

type SessionViewProps = {
  shouldStartStream: boolean;
};

export function SessionView({ shouldStartStream }: SessionViewProps) {
  const { state } = useAgentTaskState();
  const { continue: continueTask } = useAgentTaskAction();
  useMount(() => {
    if (shouldStartStream) {
      continueTask();
    }
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <TaskConversation />
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
        <div className="mx-auto w-full max-w-3xl">
          <div className="w-7/8 mx-auto">
            {state === "idle" && <ContinueTask />}
            {state === "error" && <ErrorRetry />}
          </div>
          <PromptInputProvider>
            <PromptInput />
          </PromptInputProvider>
        </div>
      </div>
    </div>
  );
}
