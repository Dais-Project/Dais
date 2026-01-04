import { Activity } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { Message as ConversationMessage } from "@/types/message";
import { TextMessage } from "./TextMessage";
import { ToolMessage } from "./ToolMessage";

type TaskConversationProps = {
  messages: ConversationMessage[] | null;
  isLoading: boolean;
  onCustomToolAction?: (
    toolMessageId: string,
    event: string,
    data: string
  ) => void;
};

export function TaskConversation({
  messages,
  isLoading,
  onCustomToolAction,
}: TaskConversationProps) {
  return (
    <Conversation id="conversation" className="conversation-container">
      <ConversationContent className="gap-y-4">
        <Activity mode={isLoading ? "visible" : "hidden"}>
          <ConversationEmptyState />
        </Activity>
        <Activity mode={isLoading ? "hidden" : "visible"}>
          {messages?.map((message, index) => {
            if (message.role === "system") {
              return null;
            }
            if (message.role === "tool") {
              return (
                <ToolMessage
                  key={index}
                  message={message}
                  onCustomToolAction={onCustomToolAction}
                />
              );
            }
            return (
              <TextMessage
                key={index}
                text={message.content as string | null}
                from={message.role}
              />
            );
          })}
        </Activity>
        <ConversationScrollButton />
      </ConversationContent>
    </Conversation>
  );
}
