import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { useAgentTaskState } from "../../hooks/use-agent-task";
import { TextMessage } from "./TextMessage";
import { ToolMessage } from "./ToolMessage";

export function TaskConversation() {
  const { data } = useAgentTaskState();
  return (
    <Conversation id="conversation" className="conversation-container">
      <ConversationContent className="gap-y-4">
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
              text={message.content as string | null}
              from={message.role}
            />
          );
        })}
        <ConversationScrollButton />
      </ConversationContent>
    </Conversation>
  );
}
