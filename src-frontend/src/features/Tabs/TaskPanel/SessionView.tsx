import { useMount } from "ahooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ContinueTask } from "./components/ContinueTask";
import { PromptInput } from "./components/PromptInput";
import { TaskConversation } from "./components/TaskConversation";
import { useAgentTaskAction } from "./hooks/use-agent-task";

export function SessionViewSkeleton() {
  return (
    <div className="flex h-full flex-col space-y-4 p-4 pt-0">
      <div className="flex flex-1 flex-col space-y-2 overflow-y-hidden py-4">
        <Skeleton className="h-20 w-1/3 self-end rounded-lg" />
        <Skeleton className="h-40 w-3/4 self-start rounded-lg" />
        <Skeleton className="h-20 w-3/4 self-start rounded-lg" />
      </div>
      <div className="flex flex-col gap-y-2">
        <Skeleton className="h-24 w-full rounded-md" />
        <Skeleton className="h-10 w-24 self-end rounded-md" />
      </div>
    </div>
  );
}

type SessionViewProps = {
  shouldStartStream: boolean;
};

export function SessionView({ shouldStartStream }: SessionViewProps) {
  const { continue: continueTask } = useAgentTaskAction();
  useMount(() => {
    if (shouldStartStream) {
      continueTask();
    }
  });
  return (
    <div className="flex h-full flex-col p-4 pt-0">
      <TaskConversation />
      <ContinueTask />
      <PromptInput />
    </div>
  );
}
