import { useMount } from "ahooks";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContinueTask } from "./components/ContinueTask";
import { ErrorRetry } from "./components/ErrorRetry";
import { PromptInput } from "./components/PromptInput";
import { TaskConversation } from "./components/TaskConversation";
import { useAgentTaskAction, useAgentTaskState } from "./hooks/use-agent-task";

export function SessionViewSkeleton() {
  return (
    <div className="flex h-full flex-col space-y-4 p-4 pt-0">
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
    <div className="flex h-full flex-col p-4 pt-0">
      <TaskConversation />
      <div className="relative">
        <div className="absolute top-0 flex w-full -translate-y-full justify-center">
          {state === "idle" && <ContinueTask />}
          {state === "error" && <ErrorRetry />}
        </div>
        <PromptInput />
      </div>
    </div>
  );
}
