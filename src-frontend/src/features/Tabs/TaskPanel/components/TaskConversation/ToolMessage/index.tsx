import type { ToolMessage as ToolMessageType } from "@/types/message";
import { AskUserToolMessage } from "./AskUserToolMessage";
import { FinishTaskToolMessage } from "./FinishTaskToolMessage";
import { GeneralToolMessage } from "./GeneralToolMessage";

type ToolMessageProps = {
  message: ToolMessageType;
};

export function ToolMessage({ message }: ToolMessageProps) {
  if (message.name === "ask_user") {
    return <AskUserToolMessage message={message} />;
  }
  if (message.name === "finish_task") {
    return <FinishTaskToolMessage message={message} />;
  }
  return <GeneralToolMessage message={message} />;
}
