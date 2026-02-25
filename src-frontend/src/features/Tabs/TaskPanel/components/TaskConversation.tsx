import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { useAgentTaskState } from "../hooks/use-agent-task";
import { ToolMessage } from "./messages/BuiltInToolMessage";
import { TextMessage } from "./messages/TextMessage";

export function TaskConversation() {
  const { data } = useAgentTaskState();
  return (
    <Conversation id="conversation" className="conversation-container min-h-0">
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
