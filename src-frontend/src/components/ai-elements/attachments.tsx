import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  Music2Icon,
  PaperclipIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UiFile } from "./prompt-input";

// ============================================================================
// Types
// ============================================================================

export type AttachmentData = (UiFile & { id: string });
export type AttachmentCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "source"
  | "unknown";

export type AttachmentVariant = "grid" | "inline" | "list";

export const attachmentCategoryIcons: Record<AttachmentCategory, typeof ImageIcon> = {
  audio: Music2Icon,
  document: FileTextIcon,
  image: ImageIcon,
  source: GlobeIcon,
  unknown: PaperclipIcon,
  video: VideoIcon,
};

// ============================================================================
// Utility Functions
// ============================================================================

export function resolveMimetypeCategory(mimetype: string): AttachmentCategory {
  if (mimetype.startsWith("image/")) {
    return "image";
  }
  if (mimetype.startsWith("video/")) {
    return "video";
  }
  if (mimetype.startsWith("audio/")) {
    return "audio";
  }
  if (mimetype.startsWith("application/") || mimetype.startsWith("text/")) {
    return "document";
  }
  return "unknown";
}

export function resolveAttachmentLabel(data: AttachmentData): string {
  const category = resolveMimetypeCategory(data.mimetype);
  return data.name || (category === "image" ? "Image" : "Attachment");
};

export function useObjectUrl(file: File): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return objectUrl;
}

type AttachmentImageProps = {
  filename: string;
  file: File;
  isGrid: boolean;
};

const AttachmentImage = memo(function ({ filename, file, isGrid }: AttachmentImageProps) {
  const objectUrl = useObjectUrl(file);
  if (objectUrl === null) return null;

  return isGrid ? (
    <img
      alt={filename || "Image"}
      className="size-full object-cover"
      height={96}
      src={objectUrl}
      width={96}
    />
  ) : (
    <img
      alt={filename || "Image"}
      className="size-full rounded object-cover"
      height={20}
      src={objectUrl}
      width={20}
    />
  );
});

const AttachmentVideo = memo(function ({ file }: { file: File }) {
  const objectUrl = useObjectUrl(file);
  if (objectUrl === null) return null;
  return <video className="size-full object-cover" muted src={objectUrl} />;
});

// ============================================================================
// Contexts
// ============================================================================

interface AttachmentsContextValue {
  variant: AttachmentVariant;
}

const AttachmentsContext = createContext<AttachmentsContextValue | null>(null);

type AttachmentContextValue = {
  data: AttachmentData;
  category: AttachmentCategory;
  variant: AttachmentVariant;
  onRemove?: () => void;
};

const AttachmentContext = createContext<AttachmentContextValue | null>(null);

// ============================================================================
// Hooks
// ============================================================================

export const useAttachmentsContext = () =>
  useContext(AttachmentsContext) ?? { variant: "grid" as const };

export const useAttachmentContext = () => {
  const ctx = useContext(AttachmentContext);
  if (!ctx) {
    throw new Error("Attachment components must be used within <Attachment>");
  }
  return ctx;
};

// ============================================================================
// Attachments - Container
// ============================================================================

export type AttachmentsProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AttachmentVariant;
};

export const Attachments = ({
  variant = "grid",
  className,
  children,
  ...props
}: AttachmentsProps) => {
  const contextValue = useMemo(() => ({ variant }), [variant]);

  return (
    <AttachmentsContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex items-start",
          variant === "list" ? "flex-col gap-2" : "flex-wrap gap-2",
          variant === "grid" && "ml-auto w-fit",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentsContext.Provider>
  );
};

// ============================================================================
// Attachment - Item
// ============================================================================

export type AttachmentProviderProps = {
  data: AttachmentData;
  children?: React.ReactNode,
  onRemove?: () => void;
};

export function AttachmentProvider({ data, children, onRemove }: AttachmentProviderProps) {
  const { variant } = useAttachmentsContext();
  const category = resolveMimetypeCategory(data.mimetype);

  const contextValue = useMemo<AttachmentContextValue>(
    () => ({ data, category, variant, onRemove }),
    [data, category, variant, onRemove]
  );
  return (
    <AttachmentContext.Provider value={contextValue}>
      {children}
    </AttachmentContext.Provider>
  )
}

export type AttachmentProps = HTMLAttributes<HTMLDivElement>;

export const Attachment = ({
  className,
  children,
  ...props
}: AttachmentProps) => {
  const { variant } = useAttachmentsContext();

  return (
    <div
      className={cn(
        "group relative",
        variant === "grid" && "size-24 overflow-hidden rounded-lg",
        variant === "inline" && [
          "flex h-8 cursor-pointer select-none items-center gap-1.5",
          "rounded-md border border-border px-1.5",
          "font-medium text-sm transition-all",
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        ],
        variant === "list" && [
          "flex w-full items-center gap-3 rounded-lg border p-3",
          "hover:bg-accent/50",
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================================================
// AttachmentPreview - Media preview
// ============================================================================

export function AttachmentPreview() {
  const { data, category } = useAttachmentContext();
  const objectUrl = useObjectUrl(data.raw);
  if (objectUrl === null) return null;

  switch (category) {
    case "image":
      return <img className="size-full" src={objectUrl} />;
    case "audio":
      return <audio controls src={objectUrl} />
    case "video":
      return <video className="size-full object-cover" muted src={objectUrl} />;
    default:
      const label = resolveAttachmentLabel(data);
      return (
        <div className="space-y-1 px-0.5">
          <h4 className="font-semibold text-sm leading-none">{label}</h4>
          <p className="font-mono text-muted-foreground text-xs">
            {data.mimetype}
          </p>
        </div>
      );
  }
};

// ============================================================================
// AttachmentThumb - Media thumbnail
// ============================================================================

export type AttachmentThumbProps = HTMLAttributes<HTMLDivElement> & {
  fallbackIcon?: ReactNode;
};

export function AttachmentThumb({
  fallbackIcon,
  className,
  ...props
}: AttachmentThumbProps) {
  const { data, category, variant } = useAttachmentContext();
  const iconSize = variant === "inline" ? "size-3" : "size-4";

  const renderIcon = (Icon: typeof ImageIcon) => (
    <Icon className={cn(iconSize, "text-muted-foreground")} />
  );

  const renderContent = () => {
    switch (category) {
      case "image":
        return <AttachmentImage filename={data.name} file={data.raw} isGrid={variant === "grid"} />;
      case "video":
        return <AttachmentVideo file={data.raw} />;
      default:
        const Icon = attachmentCategoryIcons[category];
        return fallbackIcon ?? renderIcon(Icon);
    }
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        variant === "grid" && "size-full bg-muted",
        variant === "inline" && "size-5 rounded bg-background",
        variant === "list" && "size-12 rounded bg-muted",
        className
      )}
      {...props}
    >
      {renderContent()}
    </div>
  );
};

// ============================================================================
// AttachmentInfo - Name and type display
// ============================================================================

export type AttachmentInfoProps = HTMLAttributes<HTMLDivElement> & {
  showMimetype?: boolean;
};

export function AttachmentInfo({
  showMimetype = false,
  className,
  ...props
}: AttachmentInfoProps) {
  const { data, variant } = useAttachmentContext();
  const label = resolveAttachmentLabel(data);

  if (variant === "grid") {
    return null;
  }

  return (
    <div className={cn("min-w-0 max-w-64 flex-1", className)} {...props}>
      <span className="block truncate">{label}</span>
      {showMimetype && data.mimetype && (
        <span className="block truncate text-muted-foreground text-xs">
          {data.mimetype}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// AttachmentRemove - Remove button
// ============================================================================

export type AttachmentRemoveProps = ComponentProps<typeof Button> & {
  label?: string;
};

export function AttachmentRemove({
  label = "Remove",
  className,
  children,
  ...props
}: AttachmentRemoveProps) {
  const { onRemove, variant } = useAttachmentContext();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    },
    [onRemove]
  );

  if (!onRemove) {
    return null;
  }

  return (
    <Button
      aria-label={label}
      className={cn(
        variant === "grid" && [
          "absolute top-2 right-2 size-6 rounded-full p-0",
          "bg-background/80 backdrop-blur-sm",
          "opacity-0 transition-opacity group-hover:opacity-100",
          "hover:bg-background",
          "[&>svg]:size-3",
        ],
        variant === "inline" && [
          "size-5 rounded p-0",
          "opacity-0 transition-opacity group-hover:opacity-100",
          "[&>svg]:size-2.5",
        ],
        variant === "list" && ["size-8 shrink-0 rounded p-0", "[&>svg]:size-4"],
        className
      )}
      onClick={handleClick}
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <XIcon />}
      <span className="sr-only">{label}</span>
    </Button>
  );
};

// ============================================================================
// AttachmentHoverCard - Hover preview
// ============================================================================

export type AttachmentHoverCardProps = ComponentProps<typeof HoverCard>;

export const AttachmentHoverCard = ({
  openDelay = 0,
  closeDelay = 0,
  ...props
}: AttachmentHoverCardProps) => (
  <HoverCard closeDelay={closeDelay} openDelay={openDelay} {...props} />
);

export type AttachmentHoverCardTriggerProps = ComponentProps<
  typeof HoverCardTrigger
>;

export const AttachmentHoverCardTrigger = (
  props: AttachmentHoverCardTriggerProps
) => <HoverCardTrigger {...props} />;

export type AttachmentHoverCardContentProps = ComponentProps<
  typeof HoverCardContent
>;

export const AttachmentHoverCardContent = ({
  align = "start",
  className,
  ...props
}: AttachmentHoverCardContentProps) => (
  <HoverCardContent
    align={align}
    className={cn("w-auto p-2", className)}
    {...props}
  />
);

// ============================================================================
// AttachmentEmpty - Empty state
// ============================================================================

export type AttachmentEmptyProps = HTMLAttributes<HTMLDivElement>;

export const AttachmentEmpty = ({
  className,
  children,
  ...props
}: AttachmentEmptyProps) => (
  <div
    className={cn(
      "flex items-center justify-center p-4 text-muted-foreground text-sm",
      className
    )}
    {...props}
  >
    {children ?? "No attachments"}
  </div>
);
