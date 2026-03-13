import { ClipboardCopyIcon, SquareKanbanIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserInteractionShowPlan } from "@/api/generated/schemas";
import { ShowPlanToolSchema } from "@/api/tool-schema";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CustomTool, CustomToolContent, CustomToolFooter, CustonToolAction } from "./components/CustomTool";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/custom/Markdown";
import { cn } from "@/lib/utils";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";

const APPROVED_ANSWER = "Approved";

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
  const { t } = useTranslation("tabs-task");

  if (alternatives.length === 0) {
    return null;
  }

  const handleSelect = (alternative: string) => {
    if (disabled) {
      return;
    }
    onSelect(alternative);
  };

  const handleFill = (alternative: string) => {
    if (disabled) {
      return;
    }
    onFill(alternative);
  };

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
                { "opacity-60": selectedAlternative !== null && !isSelected }
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(alternative)}
                className={cn(
                  "absolute inset-0 z-0 cursor-pointer outline-none",
                  { "cursor-not-allowed": disabled }
                )}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={disabled}
                    className={cn("absolute rounded-full bottom-2 right-2 translate-x-1/2 translate-y-1/2 z-20 opacity-0 transition-opacity group-hover/plan-alternative:opacity-100", {
                      "cursor-not-allowed opacity-0!": disabled,
                    })}
                    onClick={() => handleFill(alternative)}
                  >
                    <ClipboardCopyIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("tool.show_plan.copy_to_input")}</TooltipContent>
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

export function ShowPlan({ message }: ToolMessageProps) {
  const { t } = useTranslation("tabs-task");
  const { answerTool } = useAgentTaskAction();
  const toolArguments = useToolArgument<UserInteractionShowPlan>(message, ShowPlanToolSchema);
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
    answerTool(message.call_id, APPROVED_ANSWER);
    setSelectedAlternative(APPROVED_ANSWER);
  };

  const handleUserFeedback = () => {
    if (hasResult) {
      return;
    }
    answerTool(message.call_id, userFeedback);
    setSelectedAlternative(userFeedback);
  };

  const handleSelectAlternative = (alternative: string) => {
    if (hasResult || selectedAlternative === alternative) {
      return;
    }

    setSelectedAlternative(alternative);
    answerTool(message.call_id, alternative);
  };

  const handleFillAlternative = (alternative: string) => {
    if (hasResult) {
      return;
    }
    setUserFeedback(alternative);
  };

  const content = () => {
    if (toolArguments === null) {
      return <p className="px-4 pb-4 text-muted-foreground text-sm">{t("tool.show_plan.parse_error")}</p>;
    }

    return (
      <CustomToolContent>
        <Markdown className="px-4 pb-4">{toolArguments.plan}</Markdown>
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
          placeholder={t("tool.show_plan.feedback_placeholder")}
          disabled={hasResult}
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
          {t("tool.show_plan.submit_feedback")}
        </CustonToolAction>
      );
    }
    return (
      <CustonToolAction
        variant="default"
        onClick={handleApprove}
        disabled={hasResult}
      >
        {t("tool.show_plan.approve")}
      </CustonToolAction>
    );
  };

  return (
    <CustomTool
      title={t("tool.show_plan.title")}
      icon={<SquareKanbanIcon className="size-4 text-muted-foreground" />}
      defaultOpen
    >
      {content()}
      {!hasResult && (
        <CustomToolFooter>
          {submit()}
        </CustomToolFooter>
      )}
    </CustomTool>
  );
}
