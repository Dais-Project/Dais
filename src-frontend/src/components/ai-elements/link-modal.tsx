/**
 * Modified from: https://github.com/vercel/streamdown/blob/main/packages/streamdown/lib/link-modal.tsx
 */

import { useCallback, useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COMPONENTS_STREAMDOWN_NAMESPACE } from "@/i18n/resources";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LinkSafetyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  url: string;
};

export function LinkSafetyModal({
  url,
  isOpen,
  onClose,
  onConfirm,
}: LinkSafetyModalProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation(COMPONENTS_STREAMDOWN_NAMESPACE);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn("Clipboard API not available");
    }
  }, [url]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="rounded-xl sm:max-w-md"
        data-streamdown="link-safety-modal"
        showCloseButton={false}
      >
        <DialogClose
          className="absolute top-4 right-4"
          title={t("link_safety_modal.close")}
        >
          <XIcon size={16} />
        </DialogClose>

        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            <ExternalLinkIcon size={20} />
            <span>{t("link_safety_modal.open_external_link")}</span>
          </DialogTitle>
          <DialogDescription>
            {t("link_safety_modal.external_link_warning")}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "break-all rounded-md bg-muted p-3 font-mono text-sm",
            url.length > 100 && "max-h-32 overflow-y-auto"
          )}
        >
          {url}
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleCopy}
            type="button"
            variant="outline"
          >
            {copied ? (
              <>
                <CheckIcon size={14} />
                <span>{t("link_safety_modal.copied")}</span>
              </>
            ) : (
              <>
                <CopyIcon size={14} />
                <span>{t("link_safety_modal.copy_link")}</span>
              </>
            )}
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            type="button"
          >
            <ExternalLinkIcon size={14} />
            <span>{t("link_safety_modal.open_link")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
