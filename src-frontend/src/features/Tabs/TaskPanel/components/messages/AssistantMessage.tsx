import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Markdown } from "@/components/custom/Markdown";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { saveFile } from "@/lib/save-file";
import { BrainIcon, CopyIcon, FileIcon } from "lucide-react";

type AssistantMessageProps = {
  text: string | null;
  reasoning: string | null;
  isStreaming: boolean;
};

export function AssistantMessage({
  text,
  reasoning,
  isStreaming,
}: AssistantMessageProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text?.trim() ?? "");
      toast.success(t("assistant_message.toast.copied"));
    } catch {
      toast.error(t("assistant_message.toast.copy_failed"));
    }
  }, [text, t]);

  const handleSave = useCallback(async () => {
    try {
      await saveFile("message.md", text?.trim() ?? "");
    } catch (e) {
      console.error("Failed to save: ", e);
      toast.error(t("assistant_message.toast.save_failed"));
    }
  }, [text, t]);

  const isTextEmpty = text === null || text.trim().length === 0;
  const isReasoningEmpty = reasoning === null || reasoning.trim().length === 0;
  const shouldShowThinking = isTextEmpty && !isReasoningEmpty && isStreaming;

  if (isTextEmpty && !isStreaming) return null;
  if (shouldShowThinking) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BrainIcon className="size-4 shrink-0" />
        <Shimmer duration={1} as="span">
          {t("assistant_message.thinking")}
        </Shimmer>
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Message className="selectable" from="assistant">
          <MessageContent>
            <Markdown
              mode={!isStreaming ? "static" : "streaming"}
              parseIncompleteMarkdown={isStreaming}
              controls={{ code: { download: false } }}
            >
              {!isTextEmpty ? text : ""}
            </Markdown>
          </MessageContent>
        </Message>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopy}>
          <CopyIcon className="mr-2 size-4" />
          {t("assistant_message.context_menu.copy")}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSave}>
          <FileIcon className="mr-2 size-4" />
          {t("assistant_message.context_menu.save_to_file")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
