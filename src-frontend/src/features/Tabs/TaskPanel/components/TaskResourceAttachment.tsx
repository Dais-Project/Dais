import { LinkIcon } from "lucide-react";
import type { TaskResourceMetadata } from "@/api/generated/schemas";
import { attachmentCategoryIcons, resolveMimetypeCategory } from "@/components/ai-elements/attachments";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { useAgentTaskState } from "../hooks/use-agent-task";
import { TaskResource } from "./TaskResource";

type TaskResourceAttachmentProps = {
  data: TaskResourceMetadata;
  variant: "thumbnail" | "content";
};

function TaskResourceAttachmentThumbnail({ data }: Pick<TaskResourceAttachmentProps, "data">) {
  const { taskId, taskType } = useAgentTaskState();

  if ("text" in data) {
    const Icon = attachmentCategoryIcons.document;
    return (
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if ("url" in data) {
    const Icon = attachmentCategoryIcons.source;
    return (
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
    );
  }

  const resourceType = resolveMimetypeCategory(data.mimetype);
  const content = (() => {
    switch (resourceType) {
      case "image":
        return (
          <TaskResource taskType={taskType} taskId={taskId} resourceId={data.resource_id}>
            {(resourceUrl) => (
              // biome-ignore lint/correctness/useImageSize: Resource dimensions are not available in task metadata.
              <img alt={data.filename} className="size-full object-cover" src={resourceUrl} />
            )}
          </TaskResource>
        );
      case "video":
        return (
          <TaskResource taskType={taskType} taskId={taskId} resourceId={data.resource_id}>
            {(resourceUrl) => <video className="size-full object-cover" muted src={resourceUrl} />}
          </TaskResource>
        );
      default: {
        const Icon = attachmentCategoryIcons[resourceType];
        return <Icon className="size-6 text-muted-foreground" />;
      }
    }
  })();

  return (
    <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
      <AsyncBoundary skeleton={null}>{content}</AsyncBoundary>
    </div>
  );
}

function TaskResourceAttachmentContent({ data }: Pick<TaskResourceAttachmentProps, "data">) {
  const { taskId, taskType } = useAgentTaskState();

  if ("text" in data) {
    return (
      <CodeBlock code={data.text} className="w-full" language="text" showLineNumbers={true} startingLineNumber={1} />
    );
  }

  if ("url" in data) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
        <LinkIcon className="size-5 shrink-0 text-muted-foreground" />
        <span className="break-all font-mono">{data.url}</span>
      </div>
    );
  }

  const resourceType = resolveMimetypeCategory(data.mimetype);
  const content = (() => {
    switch (resourceType) {
      case "image":
        return (
          <TaskResource taskType={taskType} taskId={taskId} resourceId={data.resource_id}>
            {(resourceUrl) => (
              // biome-ignore lint/correctness/useImageSize: Resource dimensions are not available in task metadata.
              <img alt={data.filename} className="max-h-80 rounded-lg object-contain" src={resourceUrl} />
            )}
          </TaskResource>
        );
      case "video":
        return (
          <TaskResource taskType={taskType} taskId={taskId} resourceId={data.resource_id}>
            {(resourceUrl) => (
              // biome-ignore lint: a11y/useMediaCaption
              <video className="max-h-80 rounded-lg" controls src={resourceUrl} />
            )}
          </TaskResource>
        );
      case "audio":
        return (
          <TaskResource taskType={taskType} taskId={taskId} resourceId={data.resource_id}>
            {(resourceUrl) => (
              // biome-ignore lint: a11y/useMediaCaption
              <audio className="w-full" controls src={resourceUrl} />
            )}
          </TaskResource>
        );
      default: {
        const Icon = attachmentCategoryIcons[resourceType];
        return <Icon className="size-8 text-muted-foreground" />;
      }
    }
  })();

  return <AsyncBoundary skeleton={null}>{content}</AsyncBoundary>;
}

export function TaskResourceAttachment({ data, variant }: TaskResourceAttachmentProps) {
  if (variant === "thumbnail") {
    return <TaskResourceAttachmentThumbnail data={data} />;
  }

  return <TaskResourceAttachmentContent data={data} />;
}
