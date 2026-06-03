import { GitBranchIcon, PanelRightOpenIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  OrchestrationSubtask,
  ToolMessageMetadata,
} from "@/api/generated/schemas";
import { useGetAgent } from "@/api/generated/endpoints/agent/agent";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { SubtaskToolSchema } from "@/api/tool-schema";
import { Badge } from "@/components/ui/badge";
import { getToolMessageMetadata } from "@/types/message";
import { ToolConfirmation } from "./components/ToolConfirmation";
import type { ToolMessageProps } from ".";
import {
  AgentTaskProvider,
  useAgentTaskAction,
} from "../../../hooks/use-agent-task";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import {
  ReadonlySessionView,
  ReadonlySessionViewSkeleton,
} from "../../../views/ReadonlySessionView";
import { RiskBadge } from "@/components/ai-elements/tool";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function SubtaskDrawerContent({ subtaskId }: { subtaskId: number }) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);

  return (
    <DrawerContent className="shadow w-[50vw]! max-w-3/4!">
      <DrawerHeader className="flex flex-row items-center">
        <DrawerClose asChild>
          <Button variant="ghost" size="icon-sm">
            <XIcon />
          </Button>
        </DrawerClose>
        <DrawerTitle>{t("tool.subtask.detail_title")}</DrawerTitle>
      </DrawerHeader>
      <AsyncBoundary skeleton={<ReadonlySessionViewSkeleton />}>
        <AgentTaskProvider taskId={subtaskId} taskType="subtask">
          <ReadonlySessionView />
        </AgentTaskProvider>
      </AsyncBoundary>
    </DrawerContent>
  );
}

function SubtaskAgentName({ agentId }: { agentId: number }) {
  const { data } = useGetAgent(agentId);
  if (data === undefined) return null;
  return <Badge>{data.name}</Badge>;
}

export function Subtask({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { reviewTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<OrchestrationSubtask>(
    message,
    SubtaskToolSchema,
  );
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const { userApproval, risk } = getToolMessageMetadata(message);
  const agentId = toolArguments?.action.agent_id;
  const subtaskId = (message.metadata as ToolMessageMetadata).subtask_id;

  return (
    <Drawer direction="right" modal={false}>
      <div className="border bg-card rounded-md">
        <div className="flex justify-between items-center p-3 gap-4">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <GitBranchIcon className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm">
              {t("tool.subtask.title")}
            </span>
            {typeof agentId === "number" && (
              <SubtaskAgentName agentId={agentId} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {typeof risk.level === "number" && (
              <RiskBadge level={risk.level} reason={risk.reason} />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <DrawerTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="-my-2"
                    disabled={subtaskId === undefined}
                  >
                    <PanelRightOpenIcon />
                  </Button>
                </DrawerTrigger>
              </TooltipTrigger>
              <TooltipContent align="end">
                {t("tool.subtask.view_detail")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {userApproval && (
          <ToolConfirmation
            state={userApproval}
            disabled={disabled}
            onSubmit={markAsSubmitted}
            onAccept={() => reviewTool(message.call_id, "approved")}
            onReject={() => reviewTool(message.call_id, "denied")}
          />
        )}
      </div>
      {subtaskId && <SubtaskDrawerContent subtaskId={subtaskId} />}
    </Drawer>
  );
}
