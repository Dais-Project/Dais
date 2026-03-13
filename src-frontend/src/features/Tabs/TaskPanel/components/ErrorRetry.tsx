import { CircleXIcon, RotateCcwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAgentTaskAction } from "../hooks/use-agent-task";

export function ErrorRetry() {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { continue: continueTask } = useAgentTaskAction();
  return (
    <Alert className="flex min-w-fit items-stretch rounded-b-none border-b-0">
      <div className="mr-2 flex items-center">
        <CircleXIcon className="size-4" />
      </div>
      <AlertTitle className="flex flex-1 items-center justify-between">
        <div>{t("error.banner.title")}</div>
        <Button onClick={() => continueTask()} size="sm">
          <RotateCcwIcon />
          {t("error.banner.action")}
        </Button>
      </AlertTitle>
    </Alert>
  );
}
