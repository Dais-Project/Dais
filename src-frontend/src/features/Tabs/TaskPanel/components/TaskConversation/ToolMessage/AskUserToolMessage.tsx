import { MessageCircleQuestionMark, SendIcon } from "lucide-react";
import { useState } from "react";
import { CustomTool } from "@/components/custom/ai-components/CustomTool";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ToolMessage as ToolMessageType } from "@/types/message";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";

export type AskUserToolMessageProps = {
  message: ToolMessageType;
};

export function AskUserToolMessage({ message }: AskUserToolMessageProps) {
  const { answerTool } = useAgentTaskAction();
  const [disabled, setDisabled] = useState(false);
  const toolArguments = useToolArgument<{
    question: string;
    options?: string[];
  }>(message.arguments);
  const { question, options } = toolArguments ?? {};
  const selectedOption = options && (message.result as string);

  const hasResult = message.result !== null;
  const [answer, setAnswer] = useState(message.result ?? "");

  const handleSelectOption = (option: string) => {
    setDisabled(true);
    answerTool(message.tool_call_id, option);
  };

  const handleSendAnswer = () => {
    setDisabled(true);
    if (hasResult) {
      return;
    }
    answerTool(message.tool_call_id, answer);
  };

  return (
    <CustomTool
      title="Dai 有个问题："
      icon={
        <MessageCircleQuestionMark className="size-4 text-muted-foreground" />
      }
    >
      {question && <p className="font-medium text-sm">{question}</p>}
      {options && (
        <div className="flex flex-col items-start justify-center gap-y-2">
          {options.map((option) => (
            <Button
              key={option}
              disabled={hasResult || disabled}
              variant={option === selectedOption ? "default" : "outline"}
              onClick={() => handleSelectOption(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      )}
      {!options && (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            disabled={hasResult || disabled}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendAnswer()}
          />
          <Button disabled={hasResult || disabled} onClick={handleSendAnswer}>
            <SendIcon />
          </Button>
        </div>
      )}
    </CustomTool>
  );
}
