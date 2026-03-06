import { useCallback } from "react";
import type { MessageEndEventData, MessageReplaceEventData, MessageStartEventData } from "@/types/agent-stream";
import { UiMessage, isToolMessage, UiAssistantMessage, UiToolMessage, toUiMessage, uiAssistantMessageFactory, uiToolMessageFactory } from "@/types/message";
import type { ToolCallBuffer } from "./use-tool-call-buffer";

type UseMessageLifecycleOptions = {
  setData: (updater: ImmerUpdater<UiMessage[]>) => void;
};

function replaceMessageById(draft: UiMessage[], messageId: string, nextMessage: UiMessage, notFoundWarning: string) {
  const index = draft.findIndex((message) => message.id === messageId);
  if (index === -1) {
    console.warn(notFoundWarning);
    return;
  }
  draft[index] = nextMessage;
}

export function useMessageLifecycle({ setData }: UseMessageLifecycleOptions) {
  const handleMessageStart = useCallback(
    (eventData: MessageStartEventData) => {
      setData((draft) => {
        const newMessage = uiAssistantMessageFactory(eventData.message_id);
        draft.push(newMessage);
      });
    },
    [setData]
  );

  const handleTextAccumulated = useCallback(
    (allText: string) => {
      setData((draft) => {
        const lastMessage = draft.at(-1);
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
        const toolMessage = draft.find(
          (message) => isToolMessage(message) && message.call_id === toolCallId
        ) as UiToolMessage | undefined;

        if (toolMessage === undefined) {
          draft.push(uiToolMessageFactory(toolCall.id, toolCall.name, toolCall.arguments));
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
          toUiMessage(eventData.message) as UiAssistantMessage,
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
          toUiMessage(eventData.message) as UiAssistantMessage,
          `Message not found for replacement: ${eventData.message.id}`
        );
      });
    },
    [setData]
  );

  const handleClose = useCallback(() => {
    setData((draft) => (
      draft.filter((message) => {
        const isDeterminedMessage = message.id !== undefined;
        if (!isDeterminedMessage) {
          console.warn("Undetermined message found and removed: ", message);
        }
        return isDeterminedMessage;
      })
    ));
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
