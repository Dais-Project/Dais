import { PencilIcon } from "lucide-react";
import { Activity, useEffect, useState } from "react";
import { Message, MessageActions, MessageContent } from "@/components/ai-elements/message";
import { Markdown } from "@/components/custom/Markdown";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/api";
import { TaskResourceMetadata } from "@/api/generated/schemas";
import { attachmentCategoryIcons, resolveMimetypeCategory } from "@/components/ai-elements/attachments";
import { useAgentTaskAction, useAgentTaskState } from "../../hooks/use-agent-task";
import { activityVisible } from "@/lib/activity-visible";

type UserMessageMode = "view" | "edit";

/**
 * Resolves linewraps to ensure markdown rendering correctness
 */
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

function UserMessageAttachment({ data }: { data: TaskResourceMetadata }) {
  const { taskId } = useAgentTaskState();
  const resourceType = resolveMimetypeCategory(data.mimetype);
  const resourceUrl = new URL(`/api/tasks/${taskId}/resources/${data.resource_id}`, API_BASE);
  const content = (() => {
    switch (resourceType) {
      case "image":
        return <img className="size-full" src={resourceUrl.toString()} />
      case "video":
        return <video className="size-full object-cover" muted src={resourceUrl.toString()} />
      default:
        const icon = attachmentCategoryIcons[resourceType];
        return icon({ className: "size-4 text-muted-foreground" });
    }
  })();
  return (
    <div className="size-24 overflow-hidden rounded-lg">
      {content}
    </div>
  );
}

type UserMessageProps = {
  messageId: string | null;
  text: string;
  attachments: TaskResourceMetadata[] | null;
  isStreaming: boolean;
};

export function UserMessage({ messageId, text, attachments, isStreaming }: UserMessageProps) {
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
    <>
      <div className="max-w-[85%] ml-auto mb-2 flex flex-wrap justify-end gap-2">
        {attachments &&
          attachments.map((data) =>
            <UserMessageAttachment key={data.resource_id} data={data} />)
        }
      </div>
      <Message className="selectable" from="user">
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

        <Activity mode={activityVisible(mode === "view")}>
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
        </Activity>
      </Message>
    </>
  );
}
