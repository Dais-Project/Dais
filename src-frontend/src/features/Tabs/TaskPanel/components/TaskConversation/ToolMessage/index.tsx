import type { ToolMessage as ToolMessageType } from "@/types/message";
import { AskUserToolMessage } from "./AskUserToolMessage";
import { FinishTaskToolMessage } from "./FinishTaskToolMessage";
import { GeneralToolMessage } from "./GeneralToolMessage";

type ToolMessageProps = {
  message: ToolMessageType;
  onCustomToolAction?: (
    toolMessageId: string,
    event: string,
    data: string
  ) => void;
};

export function ToolMessage({ message, onCustomToolAction }: ToolMessageProps) {
  if (message.name === "ask_user") {
    return (
      <AskUserToolMessage
        message={message}
        onCustomToolAction={onCustomToolAction}
      />
    );
  }
  if (message.name === "finish_task") {
    return (
      <FinishTaskToolMessage
        message={message}
        onCustomToolAction={onCustomToolAction}
      />
    );
  }
  return (
    <GeneralToolMessage
      message={message}
      onCustomToolAction={onCustomToolAction}
    />
  );
}
