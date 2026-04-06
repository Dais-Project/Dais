import { ComponentProps, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { Conversation, ConversationContent, ConversationScrollButton, useConversationContext } from "@/components/ai-elements/conversation";
import { cn } from "@/lib/utils";
import { useAgentTaskState } from "../hooks/use-agent-task";
import { ToolMessage } from "./messages/BuiltInToolMessage";
import { AssistantMessage } from "./messages/AssistantMessage";
import { UserMessage } from "./messages/UserMessage";

export function TaskConversationProvider({ className, ...props }: ComponentProps<typeof Conversation>) {
  return (
    <Conversation
      className={cn("conversation-container min-h-0", className)}
      {...props}
    />
  )
}

export const TaskConversationScrollToBottom = ConversationScrollButton;

type TaskConversationItemProps = {
  isStreaming: boolean;
  children: React.ReactNode;
};

function TaskConversationItem({ isStreaming, children }: TaskConversationItemProps) {
  const { isScrolling } = useConversationContext();
  const { scrollRef } = useStickToBottomContext();
  const [isShown, setIsShown] = useState(true);
  const heightRef = useRef<number | null>(null);

  const { ref, inView } = useInView({
    root: scrollRef.current,
    rootMargin: "240px 0px",
    onChange: (inView, entry) => {
      if (!inView && entry.target instanceof HTMLElement) {
        const height = entry.target.offsetHeight;
        if (height > 0) {
          heightRef.current = entry.target.offsetHeight
        }
      }
    }
  });
  useEffect(() => {
    if (inView) {
      setIsShown(true);
    } else if (!isScrolling) {
      setIsShown(false);
    }
  }, [isScrolling, inView]);

  return (
    <div ref={ref}>
      {(isShown || isStreaming || heightRef.current === null)
        ? children
        : <div style={{ height: heightRef.current }} />}
    </div>
  );
}

export function TaskConversationContent() {
  const { messages } = useAgentTaskState();
  return (
    <ConversationContent className="mx-auto w-full max-w-3xl gap-y-4 pb-52">
      {messages.map((message) => {
        switch (message.role) {
          case "user":
            return (
              <TaskConversationItem
                isStreaming={message.isStreaming}
                key={message.id ?? message.content}
              >
                <UserMessage
                  key={message.id ?? message.content}
                  messageId={message.id ?? null}
                  text={message.content}
                  isStreaming={message.isStreaming}
                />
              </TaskConversationItem>
            );
          case "assistant": {
            const content = message.content ?? message.reasoning_content;
            if (content === null || content.length === 0) {
              return null;
            }
            return (
              <TaskConversationItem
                isStreaming={message.isStreaming}
                key={message.id ?? message.content}
              >
                <AssistantMessage
                  text={content}
                  isStreaming={message.isStreaming}
                />
              </TaskConversationItem>
            );
          }
          case "tool":
            return (
              <TaskConversationItem
                isStreaming={message.isStreaming}
                key={message.id ?? message.call_id}
              >
                <ToolMessage message={message} />
              </TaskConversationItem>
            );
          default:
            console.warn("Skipped UI message: ", message);
            return null
        }
      })}
    </ConversationContent>
  );
}
