import { InfoIcon, PlayIcon } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ContinueTaskProps = {
  onContinue: () => void;
};

export function ContinueTask({ onContinue }: ContinueTaskProps) {
  return (
    <Alert className="flex w-4/5 min-w-fit items-stretch self-center rounded-b-none border-b-0">
      <div className="mr-2 flex items-center">
        <InfoIcon className="size-4" />
      </div>
      <AlertTitle className="flex flex-1 items-center justify-between">
        <div className="">任务已暂停，点击继续执行</div>
        <Button onClick={onContinue} size="sm">
          <PlayIcon />
          继续任务
        </Button>
      </AlertTitle>
    </Alert>
  );
}
