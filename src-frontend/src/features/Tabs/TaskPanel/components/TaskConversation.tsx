import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
} from "react";
import { useInView } from "react-intersection-observer";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  useConversationContext,
} from "@/components/ai-elements/conversation";
import { cn } from "@/lib/utils";
import { useAgentTaskState } from "../hooks/use-agent-task";
import { ToolMessage } from "./messages/BuiltInToolMessage";
import { AssistantMessage } from "./messages/AssistantMessage";
import { UserMessage } from "./messages/UserMessage";
import type { TaskResourceMetadata } from "@/api/generated/schemas";
import type { UiMessage } from "@/types/message";

export function TaskConversationProvider({
  className,
  ...props
}: ComponentProps<typeof Conversation>) {
  return (
    <Conversation
      className={cn("conversation-container min-h-0", className)}
      {...props}
    />
  );
}

export const TaskConversationScrollToBottom = ConversationScrollButton;

type TaskConversationItemProps = {
  isStreaming: boolean;
  children: React.ReactNode;
};

function TaskConversationItem({
  isStreaming,
  children,
}: TaskConversationItemProps) {
  const { isScrolling } = useConversationContext();
  const { scrollRef } = useStickToBottomContext();
  const [isShown, setIsShown] = useState(true);
  const heightRef = useRef<number | null>(null);

  const handleIntersectionChange = useCallback(
    (inView: boolean, entry: IntersectionObserverEntry) => {
      if (!inView && entry.target instanceof HTMLElement) {
        const height = entry.target.offsetHeight;
        if (height > 0) {
          heightRef.current = height;
        }
      }
    },
    [],
  );

  const { ref, inView } = useInView({
    root: scrollRef.current,
    rootMargin: "240px 0px",
    onChange: handleIntersectionChange,
  });
  useEffect(() => {
    if (inView) {
      setIsShown(true);
    } else if (!isScrolling) {
      setIsShown(false);
    }
  }, [isScrolling, inView]);

  const shouldRender = isShown || isStreaming || heightRef.current === null;
  return (
    <div ref={ref}>
      {shouldRender ? children : <div style={{ height: heightRef.current! }} />}
    </div>
  );
}

const TaskMessageItem = memo(
  ({ message }: { message: UiMessage }) => {
    switch (message.role) {
      case "user":
        return (
          <TaskConversationItem isStreaming={message.isStreaming}>
            <UserMessage
              messageId={message.id ?? null}
              text={message.content}
              attachments={
                (message.attachments as TaskResourceMetadata[]) ?? null
              }
              isStreaming={message.isStreaming}
            />
          </TaskConversationItem>
        );
      case "assistant": {
        const { content } = message;
        if (content === null || content.length === 0) {
          return null;
        }
        return (
          <TaskConversationItem isStreaming={message.isStreaming}>
            <AssistantMessage
              text={content}
              isStreaming={message.isStreaming}
            />
          </TaskConversationItem>
        );
      }
      case "tool":
        return (
          <TaskConversationItem isStreaming={message.isStreaming}>
            <ToolMessage message={message} />
          </TaskConversationItem>
        );
      default:
        console.warn("Skipped UI message: ", message);
        return null;
    }
  },
  (prev, next) => prev.message === next.message,
);

export function TaskConversationContent() {
  const { messages } = useAgentTaskState();
  return (
    <ConversationContent className="mx-auto w-full max-w-3xl gap-y-4 pb-52">
      {messages.map((message) => (
        <TaskMessageItem key={message.id} message={message} />
      ))}
    </ConversationContent>
  );
}
