import { ComponentProps } from "react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { cn } from "@/lib/utils";
import { useAgentTaskState } from "../hooks/use-agent-task";
import { ToolMessage } from "./messages/BuiltInToolMessage";
import { TextMessage } from "./messages/TextMessage";

export function TaskConversationProvider({className, ...props}: ComponentProps<typeof Conversation>) {
  return (
    <Conversation
      id="conversation"
      className={cn("conversation-container min-h-0", className)}
      {...props}
    />
  )
}

export const TaskConversationScrollToBottom = ConversationScrollButton;

export function TaskConversationContent() {
  const { data } = useAgentTaskState();
  return (
      <ConversationContent className="mx-auto w-full max-w-3xl gap-y-4 pb-52">
        {data.messages.map((message) => {
          if (message.role === "system") {
            return null;
          }
          if (message.role === "tool") {
            return <ToolMessage key={message.id} message={message} />;
          }
          return (
            <TextMessage
              key={message.id ?? message.content}
              text={message.role === "user"
                      ? message.content
                      // for assistant message, we use reasoning_content as fallback when content is null
                      : (message.content ?? message.reasoning_content)}
              from={message.role}
            />
          );
        })}
      </ConversationContent>
  );
}
