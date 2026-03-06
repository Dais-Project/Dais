import { useCallback } from "react";
import { UiMessage, isToolMessage, UiAssistantMessage, UiToolMessage, toUiMessage, uiAssistantMessageFactory, uiToolMessageFactory, SdkToolMessage, SdkAssistantMessage, SdkMessage } from "@/types/message";
import type { ToolCallBuffer } from "./use-tool-call-buffer";

type UseMessageLifecycleOptions = {
  setData: (updater: ImmerUpdater<UiMessage[]>) => void;
};

type UseMessageLifecycleResult = {
  handleMessageStart: (message_id: string) => void;
  handleTextAccumulated: (allText: string) => void;
  handleToolCallAccumulated: (toolCallId: string, toolCall: ToolCallBuffer) => void;
  handleToolCallEnd: (message: SdkToolMessage) => void;
  handleMessageEnd: (message: SdkAssistantMessage) => void;
  handleMessageReplace: (updatedMessage: SdkMessage) => void;
  handleClose: () => void;
};

function replaceMessageById(draft: UiMessage[], messageId: string, nextMessage: UiMessage, notFoundWarning: string) {
  const index = draft.findIndex((message) => message.id === messageId);
  if (index === -1) {
    console.warn(notFoundWarning);
    return;
  }
  draft[index] = nextMessage;
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
          draft.push(uiToolMessageFactory(toolCall.call_id, toolCall.name, toolCall.arguments));
          return;
        }
        toolMessage.name = toolCall.name;
        toolMessage.arguments = toolCall.arguments;
      });
    },
    [setData]
  );

  const handleToolCallEnd = useCallback(
    (message: SdkToolMessage) => {
      setData((draft) => {
        const index = draft.findIndex(
          (m) => isToolMessage(m) && m.call_id === message.call_id
        );
        const uiMessage = toUiMessage(message);
        if (index === -1) {
          draft.push(uiMessage);
          return;
        }
        draft[index] = uiMessage;
      });
    },
    [setData]
  );

  const handleMessageEnd = useCallback(
    (message: SdkAssistantMessage) => {
      setData((draft) => {
        replaceMessageById(
          draft,
          message.id!,
          toUiMessage(message) as UiAssistantMessage,
          `Message not found for replacement: ${message.id}`
        );
      });
    },
    [setData]
  );

  const handleMessageReplace = useCallback(
    (updatedMessage: SdkMessage) => {
      setData((draft) => {
        replaceMessageById(
          draft,
          updatedMessage.id!,
          toUiMessage(updatedMessage) as UiMessage,
          `Message not found for replacement: ${updatedMessage.id}`
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
    handleToolCallEnd,
    handleMessageEnd,
    handleMessageReplace,
    handleClose,
  };
}
