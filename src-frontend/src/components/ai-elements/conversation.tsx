import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useThrottle } from "ahooks";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StickToBottom, StickToBottomContext, useStickToBottomContext } from "use-stick-to-bottom";

type ConversationState = {
  isScrolling: boolean;
};
const ConversationContext = createContext<ConversationState | null>(null);

export function useConversationContext(): ConversationState {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversationContext must be used within Provider");
  }
  return context;
}

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => {
  const contextRef = useRef<StickToBottomContext | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const scrollEl = contextRef.current?.scrollRef.current;
    const handleScroll = () => setIsScrolling(true);
    const handleScrollEnd = () => setIsScrolling(false);
    if (scrollEl) {
      scrollEl.addEventListener("scroll", handleScroll);
      scrollEl.addEventListener("scrollend", handleScrollEnd);
    }
    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener("scroll", handleScroll);
        scrollEl.removeEventListener("scrollend", handleScrollEnd);
      }
    }
  }, []);

  const throttledIsScrolling = useThrottle(isScrolling, { wait: 16 });
  const value = useMemo(() => ({ isScrolling: throttledIsScrolling }), [throttledIsScrolling]);

  return (
    <ConversationContext value={value}>
      <StickToBottom
        className={cn("relative flex-1 overflow-y-hidden", className)}
        initial="smooth"
        resize="smooth"
        role="log"
        contextRef={contextRef}
        {...props}
      />
    </ConversationContext>
  );
};

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex flex-col gap-8 p-4", className)}
    {...props}
  />
);

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
          className
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};
