import { CheckIcon, InfoIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAgentTaskAction } from "../../hooks/use-agent-task";

export function ApproveAll() {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { approvePendings } = useAgentTaskAction();

  return (
    <Alert className="min-w-fit items-stretch rounded-b-none border-b-0">
      <div className="mr-2 flex items-center">
        <InfoIcon className="size-4" />
      </div>
      <AlertTitle className="flex flex-1 items-center justify-between">
        <div>{t("approve_all.banner.title")}</div>
        <Button onClick={approvePendings} size="sm">
          <CheckIcon />
          {t("approve_all.banner.action")}
        </Button>
      </AlertTitle>
    </Alert>
  );
}
