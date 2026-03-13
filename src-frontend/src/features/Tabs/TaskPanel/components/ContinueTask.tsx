import { InfoIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { BuiltInTools, type ToolMessageMetadata } from "@/api/generated/schemas";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ClosableWrapper } from "@/components/custom/ClosableWrapper";
import { type UiMessage, isToolMessageCompleted,  } from "@/types/message";
import { useAgentTaskAction, useAgentTaskState } from "../hooks/use-agent-task";

function shouldShow(message: UiMessage[]): boolean {
  const lastMessage = message.at(-1);
  if (!lastMessage || lastMessage.role === "system") {
    return false;
  }
  if (lastMessage.role === "user" || lastMessage.role === "assistant") {
    return true;
  }
  // assertion: lastMessage.role === "tool"
  if (lastMessage.name === BuiltInTools.ExecutionControl__finish_task) {
    return false;
  }
  if (isToolMessageCompleted(lastMessage)) {
    return true;
  }
  const userApproval = (lastMessage.metadata as ToolMessageMetadata)?.user_approval;
  if (userApproval === "pending") {
    return false;
  }
  if (userApproval === "approved" || userApproval === "denied") {
    return true;
  }
  return false;
}

export function ContinueTask() {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { messages } = useAgentTaskState();
  const { continue: continueTask } = useAgentTaskAction();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(shouldShow(messages));
  }, [messages]);

  if (!show) {
    return null;
  }

  return (
    <ClosableWrapper onClose={() => setShow(false)}>
      <Alert className="min-w-fit items-stretch rounded-b-none border-b-0">
        <div className="mr-2 flex items-center">
          <InfoIcon className="size-4" />
        </div>
        <AlertTitle className="flex flex-1 items-center justify-between">
          <div>{t("continue.banner.title")}</div>
          <Button onClick={() => continueTask()} size="sm">
            <PlayIcon />
            {t("continue.banner.action")}
          </Button>
        </AlertTitle>
      </Alert>
    </ClosableWrapper>
  );
}
