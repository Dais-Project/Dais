import { useCallback } from "react";
import { current } from "immer";
import { UiMessage, isToolMessage, toUiMessage, uiAssistantMessageFactory, uiToolMessageFactory, SdkToolMessage, SdkAssistantMessage, SdkMessage } from "@/types/message";
import type { ToolCallBuffer } from "./use-tool-call-buffer";

type UseMessageLifecycleOptions = {
  setData: (updater: ImmerUpdater<UiMessage[]>) => void;
};

type UseMessageLifecycleResult = {
  handleMessageStart: (message_id: string) => void;
  handleTextAccumulated: (messageId: string, allText: string) => void;
  handleToolCallAccumulated: (toolCallId: string, toolCall: ToolCallBuffer) => void;
  handleToolCallEnd: (message: SdkToolMessage) => void;
  handleMessageEnd: (message: SdkAssistantMessage) => void;
  handleMessageReplace: (updatedMessage: SdkMessage) => void;
  handleClose: () => void;
};

function replaceMessageById(draft: UiMessage[], messageId: string, nextMessage: UiMessage): boolean {
  const index = draft.findIndex((message) => message.id === messageId);
  if (index === -1) {
    return false;
  }
  draft[index] = nextMessage;
  return true;
}

export function useMessageLifecycle({ setData }: UseMessageLifecycleOptions): UseMessageLifecycleResult {
  const handleMessageStart = useCallback(
    (message_id: string) => {
      setData((draft) => {
        const newMessage = uiAssistantMessageFactory(message_id);
        draft.push(newMessage);
      });
    },
    [setData]
  );

  const handleTextAccumulated = useCallback(
    (messageId: string, allText: string) => {
      setData((draft) => {
        for (const message of draft.reverseIter()) {
          if (message.id === messageId && message.role === "assistant") {
            message.content = allText;
            return;
          }
        }
        console.warn("Assistant message not found for text accumulation: ", messageId);
      });
    },
    [setData]
  );

  const handleToolCallAccumulated = useCallback(
    (toolCallId: string, toolCall: ToolCallBuffer) => {
      setData((draft) => {
        for (const message of draft.reverseIter()) {
          if (isToolMessage(message) && message.call_id === toolCallId) {
            message.name = toolCall.name;
            message.arguments = toolCall.arguments;
            return;
          }
        }
        draft.push(uiToolMessageFactory(toolCall.call_id, toolCall.name, toolCall.arguments));
      });
    },
    [setData]
  );

  const handleToolCallEnd = useCallback(
    (completeMessage: SdkToolMessage) => {
      setData((draft) => {
        const index = draft.findIndex((message) =>
          isToolMessage(message) && message.call_id === completeMessage.call_id);
        if (index === -1) {
          console.warn("Tool call not found for replacement: ", completeMessage);
          return;
        }
        draft[index] = toUiMessage(completeMessage);
      });
    },
    [setData]
  );

  const handleMessageEnd = useCallback(
    (message: SdkAssistantMessage) => {
      setData((draft) => {
        const replaced = replaceMessageById(
          draft,
          message.id!,
          toUiMessage(message),
        );
        if (!replaced) {
          console.warn("Assistant message not found for replacement: ", message);
        }
      });
    },
    [setData]
  );

  const handleMessageReplace = useCallback(
    (updatedMessage: SdkMessage) => {
      setData((draft) => {
        const replaced = replaceMessageById(
          draft,
          updatedMessage.id!,
          toUiMessage(updatedMessage),
        );
        if (!replaced) {
          console.warn("Message not found for replacement: ", updatedMessage);
        }
      });
    },
    [setData]
  );

  const handleClose = useCallback(() => {
    setData((draft) => (
      draft.filter((message) => {
        const isDeterminedMessage = message.id !== undefined;
        if (!isDeterminedMessage) {
          console.warn("Undetermined message found and removed: ", current(message));
        }
        return isDeterminedMessage;
      })
    ));
  }, [setData]);

  return {
    handleMessageStart,
    handleTextAccumulated,
    handleToolCallAccumulated,
    handleToolCallEnd,
    handleMessageEnd,
    handleMessageReplace,
    handleClose,
  };
}
