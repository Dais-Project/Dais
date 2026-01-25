import { MessageCircleQuestionMark, SendIcon } from "lucide-react";
import { useState } from "react";
import { CustomTool } from "@/components/custom/ai-components/CustomTool";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ToolMessage as ToolMessageType } from "@/types/message";

export type AskUserToolMessageProps = {
  message: ToolMessageType;
  onCustomToolAction?: (
    toolMessageId: string,
    event: string,
    data: string
  ) => void;
};

export function AskUserToolMessage({
  message,
  onCustomToolAction,
}: AskUserToolMessageProps) {
  const toolArguments = JSON.parse(message.arguments) as Record<
    string,
    unknown
  >;
  const question = toolArguments.question as string;
  const options = toolArguments.options as string[] | null | undefined;
  const selectedOption = options && (message.result as string);
  const hasResult = message.result !== null;

  const [answer, setAnswer] = useState(message.result ?? "");

  const handleSelectOption = (option: string) => {
    onCustomToolAction?.(message.id, "select", option);
  };

  const handleSendAnswer = () => {
    if (hasResult) {
      return;
    }
    onCustomToolAction?.(message.id, "text", answer);
  };

  return (
    <CustomTool
      title="Dai 有个问题："
      icon={
        <MessageCircleQuestionMark className="size-4 text-muted-foreground" />
      }
    >
      <p className="font-medium text-sm">{question}</p>
      {options && (
        <div className="flex flex-col items-start justify-center gap-y-2">
          {options.map((option) => (
            <Button
              key={option}
              disabled={hasResult}
              variant={option === selectedOption ? "default" : "outline"}
              onClick={() => handleSelectOption(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      )}
      {options ? null : (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            disabled={hasResult}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendAnswer()}
          />
          <Button disabled={hasResult} onClick={handleSendAnswer}>
            <SendIcon />
          </Button>
        </div>
      )}
    </CustomTool>
  );
}
