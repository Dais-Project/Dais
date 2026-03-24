import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { LinkSafetyModal } from "@/components/ai-elements/link-modal";
import { cn } from "@/lib/utils";
import { isTauri } from "@tauri-apps/api/core";

type MarkdownProps = React.ComponentProps<typeof Streamdown>;

export function Markdown({ className, ...props }: MarkdownProps) {
  return (
    <Streamdown
      className={cn(
        "size-full font-medium text-foreground text-sm-plus [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      plugins={{ code, mermaid, math, cjk }}
      controls={{ code: false }}
      linkSafety={{
        enabled: true,
        renderModal: ({ url, isOpen, onClose, onConfirm }) => (
          <LinkSafetyModal
            url={url}
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={async () => {
              if (isTauri()) {
                const { openUrl } = await import("@tauri-apps/plugin-opener");
                await openUrl(url);
              }
              onConfirm();
            }}
          />
        )
      }}
      {...props}
    />
  );
}