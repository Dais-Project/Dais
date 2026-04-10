import {
  Attachments,
  Attachment,
  AttachmentThumb,
  AttachmentRemove,
  AttachmentData,
  AttachmentHoverCard,
  AttachmentHoverCardContent,
  AttachmentHoverCardTrigger,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentProvider,
} from "@/components/ai-elements/attachments";
import { usePromptInputAttachments } from "@/components/ai-elements/prompt-input";
import { memo, useCallback } from "react";

type AttachmentItemProps = {
  attachment: AttachmentData;
  onRemove: (id: string) => void;
};

const AttachmentItem = memo(({ attachment, onRemove }: AttachmentItemProps) => {
  const handleRemove = useCallback(
    () => onRemove(attachment.id),
    [onRemove, attachment.id]
  );

  return (
    <AttachmentProvider data={attachment} onRemove={handleRemove}>
      <AttachmentHoverCard key={attachment.id}>
        <AttachmentHoverCardTrigger asChild>
          <Attachment>
            <div className="relative size-5 shrink-0">
              <div className="absolute inset-0 transition-opacity group-hover:opacity-0">
                <AttachmentThumb />
              </div>
              <AttachmentRemove className="absolute inset-0" />
            </div>
            <AttachmentInfo />
          </Attachment>
        </AttachmentHoverCardTrigger>
        <AttachmentHoverCardContent className="w-80">
          <AttachmentPreview />
        </AttachmentHoverCardContent>
      </AttachmentHoverCard>
    </AttachmentProvider>
  );
});

AttachmentItem.displayName = "AttachmentItem";
export function AttachmentsDisplay() {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline" className="pt-3">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onRemove={() => attachments.remove(attachment.id)}
        />
      ))}
    </Attachments>
  );
}
