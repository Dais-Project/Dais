import { Attachments, Attachment, AttachmentPreview, AttachmentRemove, AttachmentData } from "@/components/ai-elements/attachments";
import { usePromptInputAttachments } from "@/components/ai-elements/prompt-input";

function AttachmentItem({
  attachment,
  onRemove,
}: {
  attachment: AttachmentData;
  onRemove: () => void;
}) {
  return (
    <Attachment
      data={attachment}
      onRemove={onRemove}
      className="relative h-fit p-0"
    >
      <AttachmentPreview className="size-14" />
      <AttachmentRemove className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded-full p-0 bg-accent/70 dark:hover:bg-accent" />
    </Attachment>
  );
}

export function AttachmentsDisplay() {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline" className="pt-3">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        />
      ))}
    </Attachments>
  );
}
