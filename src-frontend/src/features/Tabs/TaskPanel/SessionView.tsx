import { useMount, useUnmount } from "ahooks";
import { ChevronsDownUpIcon } from "lucide-react";
import { Conversation, ConversationFloatingContent, ConversationScrollToBottom, useVirtualConversationState } from "@/components/ai-elements/virtual-conversation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { UiMessage } from "@/types/message";
import { ContinueTask } from "./components/ContinueTask";
import { ErrorRetry } from "./components/ErrorRetry";
import { PromptInput, PromptInputProvider } from "./components/PromptInput";
import { useAgentTaskAction, useAgentTaskState } from "./hooks/use-agent-task";
import { CollapsibleStoreProvider, useCollapsibleStore } from "./hooks/use-collapse-store";
import { MessageDispatcher } from "./components/messages/MessageDispatcher";

export function SessionViewSkeleton() {
  return (
    <div className="h-full space-y-4 p-4 pt-0">
      <div className="mx-auto flex size-full max-w-3xl flex-col space-y-4">
        <div className="flex flex-1 flex-col space-y-2 overflow-y-hidden py-4">
          <Skeleton className="h-20 w-1/3 self-end rounded-lg" />
          <Skeleton className="h-40 w-3/4 self-start rounded-lg" />
          <Skeleton className="h-20 w-3/4 self-start rounded-lg" />
        </div>
        <Card className="w-full animate-pulse bg-accent/30">
          <CardContent className="space-y-2">
            <Skeleton className="h-6 w-full rounded-md" />
            <Skeleton className="h-6 max-w-64 rounded-md" />
          </CardContent>
          <CardFooter>
            <div className="flex w-full justify-between items-end">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="size-9 rounded-md" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function CollapseAllButton() {
  const { virtualizer } = useVirtualConversationState();
  const collapseAll = useCollapsibleStore((store) => store.collapseAll);

  const handleClick = () => {
    collapseAll();
    requestAnimationFrame(() => {
      const scrollEl = virtualizer.scrollElement;
      scrollEl && (scrollEl.scrollTop = 0);
      virtualizer.measure();
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-auto">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleClick}
            aria-label="Collapse all messages"
          >
            <ChevronsDownUpIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Collapse all messages</TooltipContent>
      </Tooltip>
    </div>
  );
}

type SessionViewProps = {
  shouldStartStream: boolean;
};

export function SessionView({ shouldStartStream }: SessionViewProps) {
  const { state, messages } = useAgentTaskState();
  const { continue: continueTask, cancel: cancelTask } = useAgentTaskAction();

  useMount(() => {
    if (shouldStartStream) {
      continueTask();
    }
  });
  useUnmount(cancelTask);

  return (
    <CollapsibleStoreProvider>
      <Conversation<UiMessage>
        messages={messages}
        messageRender={MessageDispatcher}
        padding={{ top: 24, bottom: 160 }}
      >
        <CollapseAllButton />
        <ConversationFloatingContent>
          <ConversationScrollToBottom className="flex static mx-auto mb-2 pointer-events-auto" />
          <div className="w-7/8 mx-auto pointer-events-auto">
            {state === "idle" && <ContinueTask />}
            {state === "error" && <ErrorRetry />}
          </div>
          <PromptInputProvider>
            <PromptInput className="pointer-events-auto" />
          </PromptInputProvider>
        </ConversationFloatingContent>
      </Conversation>
    </CollapsibleStoreProvider>
  );
}
