import { PencilIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Message, MessageActions, MessageContent } from "@/components/ai-elements/message";
import { Markdown } from "@/components/custom/Markdown";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type UserMessageProps = {
  text: string;
  isStreaming: boolean;
};

type UserMessageMode = "view" | "edit";

function normalizeUserText(text: string) {
  let normalized = text.trim();
  normalized = normalized.replace("\n", "<br>");
  return normalized;
}

export function UserMessage({ text, isStreaming }: UserMessageProps) {
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
            {normalizeUserText(viewText)}
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
            disabled={isStreaming}
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
