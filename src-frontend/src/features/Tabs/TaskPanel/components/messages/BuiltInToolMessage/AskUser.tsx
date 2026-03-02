import { MessageCircleQuestionMark, SendIcon } from "lucide-react";
import { useState } from "react";
import type { ToolMessage, UserInteractionAskUser } from "@/api/generated/schemas";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomTool } from "@/features/Tabs/TaskPanel/components/messages/BuiltInToolMessage/components/CustomTool";
import { AskUserToolSchema } from "@/api/tool-schema";
import { useAgentTaskAction } from "../../../hooks/use-agent-task";
import { useToolArgument } from "../../../hooks/use-tool-argument";
import { Streamdown } from "streamdown";

type AskUserProps = {
  message: ToolMessage;
};

export function AskUser({ message }: AskUserProps) {
  const { answerTool } = useAgentTaskAction();
  const [disabled, setDisabled] = useState(false);
  const toolArguments = useToolArgument<UserInteractionAskUser>(message.arguments, AskUserToolSchema);
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
      title="Dais 有个问题："
      icon={<MessageCircleQuestionMark className="size-4 text-muted-foreground" />}
      defaultOpen
    >
      {question && (
        <Streamdown className="px-4 pb-2 font-medium text-sm">
          {question}
        </Streamdown>
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
    </CustomTool>
  );
}
