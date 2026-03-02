import { ClipboardCopyIcon, CommandIcon, CornerDownLeftIcon, SquareKanbanIcon } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import type { ToolMessage, UserInteractionShowPlan } from "@/api/generated/schemas";
import { ShowPlanToolSchema } from "@/api/tool-schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { CustomTool, CustomToolContent, CustomToolFooter, CustonToolAction } from "./components/CustomTool";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";

const APPROVED_ANSWER = "approved";

// TODO: show a diff of the plan with the previous plan if exists

type PlanAlternativesProps = {
  alternatives: UserInteractionShowPlan["alternatives"];
  selectedAlternative: string | null;
  disabled: boolean;
  onSelect: (alternative: string) => void;
  onFill: (alternative: string) => void;
};

function PlanAlternatives({
  alternatives,
  selectedAlternative,
  disabled,
  onSelect,
  onFill,
}: PlanAlternativesProps) {
  if (!alternatives || alternatives.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-2">
        {alternatives.map((alternative, index) => {
          const isSelected = selectedAlternative === alternative;

          return (
            <button
              type="button"
              key={`${alternative}-${index}`}
              className={cn(
                "w-[min(20rem,calc(100vw-4rem))] max-w-sm shrink-0 outline-none transition-opacity md:w-72",
                disabled && !isSelected && "cursor-not-allowed opacity-60"
              )}
              onClick={() => onSelect(alternative)}
              disabled={disabled || isSelected}
            >
              <Card
                className={cn(
                  "gap-0 py-0 transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "hover:border-primary/50 hover:bg-muted/40"
                )}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <>方案 {index + 1}</>

                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onFill(alternative)}
                          disabled={disabled}
                        >
                          <ClipboardCopyIcon className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>复制到输入框</TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>{alternative}</CardContent>
              </Card>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}


type ShowPlanProps = {
  message: ToolMessage;
};

export function ShowPlan({ message }: ShowPlanProps) {
  const { answerTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<UserInteractionShowPlan>(message.arguments, ShowPlanToolSchema);
  const hasResult = message.result !== null;

  const [userFeedback, setUserFeedback] = useState(message.result ?? "");
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(() => {
    if (typeof message.result !== "string" || message.result === APPROVED_ANSWER) {
      return null;
    }
    return message.result;
  });

  const handleApprove = () => {
    if (hasResult) {
      return;
    }
    answerTool(message.tool_call_id, APPROVED_ANSWER);
    setSelectedAlternative(APPROVED_ANSWER);
  };

  const handleUserFeedback = () => {
    if (hasResult) {
      return;
    }
    answerTool(message.tool_call_id, userFeedback);
    setSelectedAlternative(userFeedback);
  };

  const handleSelectAlternative = (alternative: string) => {
    if (hasResult || selectedAlternative === alternative) {
      return;
    }

    setSelectedAlternative(alternative);
    answerTool(message.tool_call_id, alternative);
  };

  const handleFillAlternative = (alternative: string) => {
    if (hasResult) {
      return;
    }
    setUserFeedback(alternative);
  };

  const content = () => {
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">计划参数解析失败</p>;
    }

    return (
      <CustomToolContent>
        <Streamdown className="px-4 pb-4 text-foreground text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {toolArguments.plan}
        </Streamdown>
        <PlanAlternatives
          alternatives={toolArguments.alternatives}
          selectedAlternative={selectedAlternative}
          disabled={hasResult}
          onSelect={handleSelectAlternative}
          onFill={handleFillAlternative}
        />
        <div className="px-4 mb-3">
          <Textarea
            minRows={1}
            maxRows={6}
            value={userFeedback}
            className="resize-none"
            onChange={(e) => setUserFeedback(e.target.value)}
            placeholder="请在此输入对此计划的修改意见..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                handleUserFeedback();
              }
            }}
          />
        </div>
      </CustomToolContent>
    );
  };

  const submit = () => {
    if (userFeedback) {
      return (
        <CustonToolAction
          variant="default"
          onClick={handleUserFeedback}
          disabled={hasResult}
        >
          提交修改意见
        </CustonToolAction>
      );
    }
    return (
      <CustonToolAction
        variant="default"
        onClick={handleApprove}
        disabled={hasResult}
      >
        批准计划
      </CustonToolAction>
    );
  };

  return (
    <CustomTool
      title="Dais 想要向你展示计划："
      icon={<SquareKanbanIcon className="size-4 text-muted-foreground" />}
      defaultOpen
    >
      {content()}
      <CustomToolFooter>
        {submit()}
      </CustomToolFooter>
    </CustomTool>
  );
}
