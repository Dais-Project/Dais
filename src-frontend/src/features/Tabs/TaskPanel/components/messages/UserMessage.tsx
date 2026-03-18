import { PencilIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Message, MessageActions, MessageContent } from "@/components/ai-elements/message";
import { Markdown } from "@/components/custom/Markdown";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAgentTaskAction } from "../../hooks/use-agent-task";

type UserMessageProps = {
  messageId: string | null;
  text: string;
  isStreaming: boolean;
};

type UserMessageMode = "view" | "edit";

function formatUserMessage(text: string) {
  const segments = [];
  const codeBlockRegex = /(```[\s\S]*?```|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ code: false, content: text.slice(lastIndex, match.index) });
    }
    segments.push({ code: true, content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ code: false, content: text.slice(lastIndex) });
  }

  return segments
    .map(seg =>
      seg.code
        ? seg.content
        : seg.content.replace(/(?<!\n)\n(?!\n)/g, '  \n')
    )
    .join('');
}

export function UserMessage({ messageId, text, isStreaming }: UserMessageProps) {
  const { editMessage } = useAgentTaskAction();
  const [mode, setMode] = useState<UserMessageMode>("view");
  const [draft, setDraft] = useState(text);
  const [editedText, setEditedText] = useState<string | null>(null);
  const viewText = editedText ?? text;

  useEffect(() => {
    if (mode === "view") {
      setDraft(viewText);
    }
  }, [mode, viewText]);

  if (mode === "view" && viewText.trim() === "") {
    return null;
  }

  return (
    <Message className="selectable-text" from="user">
      <MessageContent className={cn({ "w-full": mode === "edit" })}>
        {mode === "edit" ? (
          <div className="w-full space-y-3">
            <Textarea
              value={draft}
              className="w-full resize-none"
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(viewText);
                  setMode("view");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  if (messageId) {
                    editMessage(messageId, draft);
                  }
                  setEditedText(draft);
                  setMode("view");
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <Markdown mode={!isStreaming ? "static" : "streaming"} parseIncompleteMarkdown={isStreaming}>
            {formatUserMessage(viewText)}
          </Markdown>
        )}
      </MessageContent>
      {mode === "view" && (
        <MessageActions className="justify-end">
          <CopyButton variant="ghost" size="icon-sm" content={viewText.trim()} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isStreaming || !messageId}
            aria-label="Edit message"
            title="Edit message"
            onClick={() => setMode("edit")}
          >
            <PencilIcon />
          </Button>
        </MessageActions>
      )}
    </Message>
  );
}
