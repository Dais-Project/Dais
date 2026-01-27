import { useMount } from "ahooks";
import { ContinueTask } from "./components/ContinueTask";
import { PromptInput } from "./components/PromptInput";
import { TaskConversation } from "./components/TaskConversation";
import { useAgentTaskAction } from "./use-agent-task";

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
