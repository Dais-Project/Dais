import { MessageCircleQuestionMark, SendIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { UserInteractionAskUser } from "@/api/generated/schemas";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomTool, CustomToolContent } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/CustomTool";
import { AskUserToolSchema } from "@/api/tool-schema";
import { Markdown } from "@/components/custom/Markdown";
import { ToolMessageProps } from ".";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";

export function AskUser({ message }: ToolMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { answerTool } = useAgentTaskAction();
  const [disabled, setDisabled] = useState(false);
  const toolArguments = useToolArgument<UserInteractionAskUser>(message, AskUserToolSchema);
  const { question, options } = toolArguments ?? {};
  const selectedOption = options && (message.result as string);

  const hasResult = message.result !== null;
  const [answer, setAnswer] = useState(message.result ?? "");

  const handleSelectOption = (option: string) => {
    setDisabled(true);
    answerTool(message.call_id, option);
  };

  const handleSendAnswer = () => {
    setDisabled(true);
    if (hasResult) {
      return;
    }
    answerTool(message.call_id, answer);
  };

  return (
    <CustomTool
      title={t("tool.ask_user.title")}
      icon={<MessageCircleQuestionMark className="size-4 text-muted-foreground" />}
      defaultOpen={!hasResult}
    >
      <CustomToolContent>
        {question && (
          <Markdown className="px-4 pb-2">{question}</Markdown>
        )}
        {options && (
          <Suggestions className="flex-col items-start px-4 pt-2 pb-4">
            {options.map((option) => (
              <Suggestion
                key={option}
                suggestion={option}
                onClick={handleSelectOption}
                variant={option === selectedOption ? "default" : "outline"}
                disabled={hasResult || disabled}
              />
            ))}
          </Suggestions>
        )}
        {!options && (
          <div className="flex items-center gap-2 px-4 pb-4">
            <Input
              type="text"
              value={answer}
              className="flex-1"
              disabled={hasResult || disabled}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendAnswer()}
            />
            <Button
              disabled={hasResult || disabled}
              onClick={handleSendAnswer}
              className="size-9"
            >
              <SendIcon />
            </Button>
          </div>
        )}
      </CustomToolContent>
    </CustomTool>
  );
}
