import { CircleXIcon, RotateCcwIcon } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAgentTaskAction } from "../hooks/use-agent-task";

export function ErrorRetry() {
  const { continue: continueTask } = useAgentTaskAction();
  return (
    <Alert className="flex min-w-fit items-stretch rounded-b-none border-b-0">
      <div className="mr-2 flex items-center">
        <CircleXIcon className="size-4" />
      </div>
      <AlertTitle className="flex flex-1 items-center justify-between">
        <div>任务出错，请重试</div>
        <Button onClick={() => continueTask()} size="sm">
          <RotateCcwIcon />
          重试
        </Button>
      </AlertTitle>
    </Alert>
  );
}
