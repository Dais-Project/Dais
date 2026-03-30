import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";
import { useMount, useThrottleFn } from "ahooks";
import { ArrowDownIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";

const OVERSCAN = 5;

type VirtualConversationState = {
  isAtBottom: boolean;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
};

type VirtualConversationActions = {
  scrollToBottom: () => void;
};

const VirtualConversationStateContext = createContext<VirtualConversationState | null>(null);
const VirtualConversationActionsContext = createContext<VirtualConversationActions | null>(null);

export function useVirtualConversationState() {
  const ctx = useContext(VirtualConversationStateContext);
  if (!ctx) {
    throw new Error("useVirtualConversationState must be used within VirtualConversation");
  }
  return ctx;
}

export function useVirtualConversationActions() {
  const ctx = useContext(VirtualConversationActionsContext);
  if (!ctx) {
    throw new Error("useVirtualConversationActions must be used within VirtualConversation");
  }
  return ctx;
}

type VirtualConversationProps<TMessage> = {
  messages: TMessage[];
  messageRender: (props: { message: TMessage, index: number }) => React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: {
    top?: number;
    bottom?: number;
  }
};

export function Conversation<TMessage>({
  messages,
  children,
  className,
  padding,
  messageRender,
}: VirtualConversationProps<TMessage>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: messages.length,
    estimateSize: (_) => 120,
    getScrollElement: () => scrollRef.current,
    overscan: OVERSCAN,
    paddingStart: padding?.top ?? 0,
    paddingEnd: padding?.bottom ?? 0,
    isScrollingResetDelay: 300,
    useFlushSync: false,
  });
  const items = virtualizer.getVirtualItems();

  const [isAtBottom, setIsAtBottom] = useState(true);
  useMount(() => scrollToBottom());

  const { run: scrollHandler } = useThrottleFn(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const distance =
      scrollEl.scrollHeight -
      scrollEl.scrollTop -
      scrollEl.clientHeight;
    setIsAtBottom(distance < 2);
  }, { wait: 100 });

  useEffect(() => {
    const scrollEl = virtualizer.scrollElement;
    if (!scrollEl) return;
    scrollHandler();
    scrollEl.addEventListener("scroll", scrollHandler);
    return () => scrollEl.removeEventListener("scroll", scrollHandler);
  }, [virtualizer]);

  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
  }, [virtualizer, messages]);

  const state = useMemo(() => ({ isAtBottom, virtualizer }), [isAtBottom, virtualizer]);
  const actions = useMemo(() => ({ scrollToBottom }), [scrollToBottom]);

  return (
    <VirtualConversationStateContext value={state}>
      <VirtualConversationActionsContext value={actions}>
        <ScrollArea
          viewportRef={scrollRef}
          className={cn("size-full", className)}
          viewportClassName="[overflow-anchor:none]"
          data-virtual-scroll
        >
          <div
            className="relative mx-auto w-full max-w-3xl contain-strict"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
            data-virtual-relative
          >
            <div
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${items[0]?.start ?? 0}px)` }}
              data-virtual-absolute
            >
              {items.map(({ key, index }) => (
                <div
                  key={key}
                  className="pb-4"
                  ref={virtualizer.measureElement}
                  data-index={index}
                  data-virtual-item
                >
                  {messageRender({ message: messages[index], index })}
                </div>
              ))}
            </div>
          </div>
          {children}
        </ScrollArea>
      </VirtualConversationActionsContext>
    </VirtualConversationStateContext>
  );
}

type ConversationScrollToBottomProps = React.ComponentProps<typeof Button>;

export function ConversationScrollToBottom({
  className,
  ...props
}: ConversationScrollToBottomProps) {
  const { isAtBottom } = useVirtualConversationState();
  const { scrollToBottom } = useVirtualConversationActions();

  if (isAtBottom) {
    return null;
  }

  return (
    <Button
      className={cn("rounded-full pointer-events-auto", className)}
      onClick={scrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
}

type ConversationFloatingContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function ConversationFloatingContent({ children, className }: ConversationFloatingContentProps) {
  return (
    <div className={cn("absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pointer-events-none", className)}>
      <div className="mx-auto w-full max-w-3xl">
        {children}
      </div>
    </div>
  );
}
