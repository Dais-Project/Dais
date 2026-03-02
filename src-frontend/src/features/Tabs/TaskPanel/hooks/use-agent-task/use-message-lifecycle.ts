import { useCallback } from "react";
import type { AssistantMessage, TaskRead, ToolMessage } from "@/api/generated/schemas";
import type { MessageEndEventData, MessageReplaceEventData, MessageStartEventData } from "@/types/agent-stream";
import { type Message, assistantMessageFactory, isToolMessage, toolMessageFactory } from "@/types/message";
import type { ToolCallBuffer } from "./use-tool-call-buffer";

type SetTaskData = (updater: (draft: TaskRead) => void) => void;

type UseMessageLifecycleOptions = {
  setData: SetTaskData;
};

function replaceMessageById(draft: TaskRead, messageId: string, nextMessage: Message, notFoundWarning: string) {
  const index = draft.messages.findIndex((message) => message.id === messageId);
  if (index === -1) {
    console.warn(notFoundWarning);
    return;
  }
  draft.messages[index] = nextMessage;
}

export function useMessageLifecycle({ setData }: UseMessageLifecycleOptions) {
  const handleMessageStart = useCallback(
    (eventData: MessageStartEventData) => {
      setData((draft) => {
        const newMessage = assistantMessageFactory() as AssistantMessage;
        newMessage.id = eventData.message_id;
        draft.messages.push(newMessage);
      });
    },
    [setData]
  );

  const handleTextAccumulated = useCallback(
    (allText: string) => {
      setData((draft) => {
        const lastMessage = draft.messages.at(-1);
        if (lastMessage?.role === "assistant") {
          lastMessage.content = allText;
          return;
        }
        console.warn("Last message is not assistant when text chunk is accumulated");
      });
    },
    [setData]
  );

  const handleToolCallAccumulated = useCallback(
    (toolCallId: string, toolCall: ToolCallBuffer) => {
      setData((draft) => {
        const toolMessage = draft.messages.find(
          (message) => isToolMessage(message) && message.tool_call_id === toolCallId
        ) as ToolMessage | undefined;

        if (toolMessage === undefined) {
          draft.messages.push(toolMessageFactory(toolCallId, toolCall.name, toolCall.arguments) as ToolMessage);
          return;
        }

        toolMessage.name = toolCall.name;
        toolMessage.arguments = toolCall.arguments;
      });
    },
    [setData]
  );

  const handleMessageEnd = useCallback(
    (eventData: MessageEndEventData) => {
      setData((draft) => {
        replaceMessageById(
          draft,
          eventData.message.id!,
          eventData.message as Message,
          `Message not found for replacement: ${eventData.message.id}`
        );
      });
    },
    [setData]
  );

  const handleMessageReplace = useCallback(
    (eventData: MessageReplaceEventData) => {
      setData((draft) => {
        replaceMessageById(
          draft,
          eventData.message.id!,
          eventData.message as Message,
          `Message not found for replacement: ${eventData.message.id}`
        );
      });
    },
    [setData]
  );

  const handleClose = useCallback(() => {
    setData((draft) => {
      draft.messages = draft.messages.filter((message) => {
        const isDeterminedMessage = message.id !== undefined;
        if (!isDeterminedMessage) {
          console.warn("Undetermined message found and removed: ", message);
        }
        return isDeterminedMessage;
      });
    });
  }, [setData]);

  return {
    handleMessageStart,
    handleTextAccumulated,
    handleToolCallAccumulated,
    handleMessageEnd,
    handleMessageReplace,
    handleClose,
  };
}
