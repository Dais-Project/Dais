import { InfoIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAgentTaskAction, useAgentTaskState } from "../use-agent-task";

export function ContinueTask() {
  const { state, data } = useAgentTaskState();
  const { continue: continueTask } = useAgentTaskAction();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (state === "error") {
      setShow(true);
      return;
    }
    if (state !== "idle") {
      setShow(false);
      return;
    }
    const lastMessage = data.messages.at(-1);
    if (lastMessage) {
      const isAssistantMessage = lastMessage.role === "assistant";
      const isFinishTaskTool =
        lastMessage.role === "tool" && lastMessage.name === "finish_task";
      if (!(isAssistantMessage || isFinishTaskTool)) {
        setShow(true);
      }
    }
  }, [state, data]);

  if (!show) {
    return null;
  }

  return (
    <Alert className="flex w-4/5 min-w-fit items-stretch self-center rounded-b-none border-b-0">
      <div className="mr-2 flex items-center">
        <InfoIcon className="size-4" />
      </div>
      <AlertTitle className="flex flex-1 items-center justify-between">
        <div className="">任务已暂停，点击继续执行</div>
        <Button onClick={() => continueTask()} size="sm">
          <PlayIcon />
          继续任务
        </Button>
      </AlertTitle>
    </Alert>
  );
}
