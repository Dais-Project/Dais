import { GitBranchIcon, PanelRightOpenIcon, XIcon } from "lucide-react";
import type { ToolMessageMetadata } from "@/api/generated/schemas";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ToolMessageProps } from ".";
import { Button } from "@/components/ui/button";
import { getToolMessageMetadata } from "@/types/message";
import { ToolConfirmation } from "./components/ToolConfirmation";
import { AgentTaskProvider, useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolActionable } from "../../../hooks/use-tool-actionable";
import { ReadonlySessionView, ReadonlySessionViewSkeleton } from "../../../views/ReadonlySessionView";
import { RiskBadge } from "@/components/ai-elements/tool";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";

function SubtaskDrawerContent({ subtaskId }: { subtaskId: number }) {
  return (
    <DrawerContent className="shadow">
      <DrawerHeader className="flex flex-row items-center">
        <DrawerClose asChild>
          <Button variant="ghost" size="icon-sm">
            <XIcon />
          </Button>
        </DrawerClose>
        <DrawerTitle>子任务详情</DrawerTitle>
      </DrawerHeader>
      <AsyncBoundary skeleton={<ReadonlySessionViewSkeleton />}>
        <AgentTaskProvider taskId={subtaskId} taskType="subtask">
          <ReadonlySessionView />
        </AgentTaskProvider>
      </AsyncBoundary>
    </DrawerContent>
  );
}

export function Subtask({ message }: ToolMessageProps) {
  const { reviewTool } = useAgentTaskAction();
  const { disabled, markAsSubmitted } = useToolActionable(message);
  const { userApproval, risk } = getToolMessageMetadata(message);
  const subtaskId = (message.metadata as ToolMessageMetadata).subtask_id;

  return (
    <Drawer direction="right" modal={false}>
      <div className="border bg-card rounded-md">
        <div className="flex justify-between items-center p-3 gap-4">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <GitBranchIcon className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm">Dais 想要运行子任务</span>
          </div>
          <div className="flex items-center gap-2">
            {(typeof risk.level === "number") && (
              <RiskBadge level={risk.level} reason={risk.reason} />
            )}
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
