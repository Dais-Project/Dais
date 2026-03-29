import { useMount, useUnmount } from "ahooks";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UiMessage } from "@/types/message";
import { ContinueTask } from "./components/ContinueTask";
import { ErrorRetry } from "./components/ErrorRetry";
import { PromptInput, PromptInputProvider } from "./components/PromptInput";
import { useAgentTaskAction, useAgentTaskState } from "./hooks/use-agent-task";
import { AssistantMessage } from "./components/messages/AssistantMessage";
import { ToolMessage } from "./components/messages/BuiltInToolMessage";
import { UserMessage } from "./components/messages/UserMessage";
import { Conversation, ConversationFloatingContent, ConversationScrollToBottom } from "@/components/ai-elements/virtual-conversation";
import { CollapsibleStoreProvider } from "./hooks/use-collapse-store";

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

function messageRender(message: UiMessage) {
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
        messageRender={messageRender}
        padding={{ top: 24, bottom: 240 }}
      >
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
