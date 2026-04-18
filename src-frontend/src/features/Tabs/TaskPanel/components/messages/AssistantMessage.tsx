import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Markdown } from "@/components/custom/Markdown";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { saveFile } from "@/lib/save-file";
import { CopyIcon, FileIcon } from "lucide-react";

type AssistantMessageProps = {
  text: string | null;
  isStreaming: boolean;
};

export function AssistantMessage({ text, isStreaming }: AssistantMessageProps) {
  const normalizedText = useMemo(() => {
    if (text === null) {
      return null;
    }
    return text.trim();
  }, [text]);

  const { t } = useTranslation(TABS_TASK_NAMESPACE);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(normalizedText ?? "");
      toast.success(t("assistant_message.toast.copied"));
    } catch {
      toast.error(t("assistant_message.toast.copy_failed"));
    }
  }, [normalizedText, t]);

  const handleSave = useCallback(async () => {
    try {
      await saveFile("message.md", normalizedText ?? "");
    } catch (e) {
      console.error("Failed to save: ", e);
      toast.error(t("assistant_message.toast.save_failed"));
    }
  }, [normalizedText, t]);

  if (normalizedText === null) {
    return null;
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
              {normalizedText}
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

