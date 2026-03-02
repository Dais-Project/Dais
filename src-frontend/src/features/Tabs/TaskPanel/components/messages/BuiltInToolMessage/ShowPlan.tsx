import { ClipboardCopyIcon, CommandIcon, CornerDownLeftIcon, SquareKanbanIcon } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import type { ToolMessage, UserInteractionShowPlan } from "@/api/generated/schemas";
import { ShowPlanToolSchema } from "@/api/tool-schema";
import { Card, CardContent } from "@/components/ui/card";
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
  alternatives: string[];
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
  if (alternatives.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex items-start gap-3 px-4 pb-4">
        {alternatives.map((alternative, index) => {
          const isSelected = selectedAlternative === alternative;

          return (
            <Card
              key={`${alternative}-${index}`}
              className={cn(
                "group/plan-alternative relative cursor-pointer py-3 gap-0 w-[min(20rem,calc(100vw-4rem))] max-w-sm shrink-0 outline-none transition-opacity md:w-72",
                {
                  "pointer-events-none cursor-not-allowed": disabled,
                  "opacity-60": !isSelected,
                }
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(alternative)}
                className="absolute inset-0 z-0 cursor-pointer outline-none"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn("absolute rounded-full bottom-2 right-2 translate-x-1/2 translate-y-1/2 z-20 opacity-0 transition-opacity group-hover/plan-alternative:opacity-100", {
                      "pointer-events-none": disabled,
                    })}
                    onClick={() => onFill(alternative)}
                  >
                    <ClipboardCopyIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>复制到输入框</TooltipContent>
              </Tooltip>
              <CardContent className="px-4 text-start text-sm">{alternative}</CardContent>
            </Card>
          );
        })}
      </div>
      <ScrollBar className="hidden" orientation="horizontal" />
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
        {toolArguments.alternatives && (
          <PlanAlternatives
            alternatives={toolArguments.alternatives}
            selectedAlternative={selectedAlternative}
            disabled={hasResult}
            onSelect={handleSelectAlternative}
            onFill={handleFillAlternative}
          />
        )}
        <Textarea
          minRows={1}
          maxRows={6}
          value={userFeedback}
          className="px-4 border-none rounded-none shadow-none resize-none focus-visible:ring-0"
          onChange={(e) => setUserFeedback(e.target.value)}
          placeholder="在此输入对计划的修改意见..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              handleUserFeedback();
            }
          }}
        />
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
          style={{
            "--primary": "var(--color-blue-600)",
            "--primary-foreground": "var(--color-white)",
          } as React.CSSProperties}
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
