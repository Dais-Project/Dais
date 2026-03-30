import { UiMessage } from "@/types/message";
import { AssistantMessage } from "./AssistantMessage";
import { ToolMessage } from "./BuiltInToolMessage";
import { UserMessage } from "./UserMessage";

export function MessageDispatcher({ message }: { message: UiMessage }) {
  switch (message.role) {
    case "system":
      return null;
    case "tool":
      return (
        <ToolMessage
          key={message.id ?? message.call_id}
          message={message}
        />
      );
    case "user":
      return (
        <UserMessage
          key={message.id ?? message.content}
          messageId={message.id ?? null}
          text={message.content}
          isStreaming={message.isStreaming}
        />
      );
    case "assistant":
      return (
        <AssistantMessage
          key={message.id ?? message.content}
          text={message.content ?? message.reasoning_content}
          isStreaming={message.isStreaming}
        />
      );
    default:
      console.warn("Unknown message role:", message);
      return null;
  }
}
