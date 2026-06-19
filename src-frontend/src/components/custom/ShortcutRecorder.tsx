import { useCallback, useEffect, useRef, useState } from "react";
import { useRecordHotkeys } from "react-hotkeys-hook";
import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { COMPONENTS_CUSTOM_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";

type ShortcutRecorderProps = {
  value?: string[];
  onChange?: (keys: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function ShortcutRecorder({
  value = [],
  onChange,
  placeholder,
  className,
}: ShortcutRecorderProps) {
  const { t } = useTranslation(COMPONENTS_CUSTOM_NAMESPACE);
  const [recordedKeys, setRecordedKeys] = useState<string[]>(value);
  const [keys, { start, stop, resetKeys, isRecording }] = useRecordHotkeys();
  const containerRef = useRef<HTMLDivElement>(null);

  const submitRecordedKeys = useCallback(() => {
    stop();
    const keysArr = Array.from(keys);
    setRecordedKeys(keysArr);
    onChange?.(keysArr);
    resetKeys();
  }, [keys, stop, resetKeys, onChange]);

  useEffect(() => setRecordedKeys(value), [value]);

  useEffect(() => {
    const handleKeyUp = () => {
      if (keys.size === 0) {
        return;
      }

      submitRecordedKeys();
    };
    if (isRecording) {
      document.addEventListener("keyup", handleKeyUp);
      return () => {
        document.removeEventListener("keyup", handleKeyUp);
      };
    }
  }, [keys, isRecording, submitRecordedKeys]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        submitRecordedKeys();
      }
    };
    if (isRecording) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isRecording, submitRecordedKeys]);

  const startRecording = () => {
    resetKeys();
    start();
  };

  const clearShortcut = () => {
    stop();
    setRecordedKeys([]);
    onChange?.([]);
    resetKeys();
  };

  const displayKeys = isRecording ? Array.from(keys) : recordedKeys;

  return (
    <div
      ref={containerRef}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
        isRecording
          ? "border-primary ring-primary/20 bg-primary/5 ring-2"
          : "border-input bg-background hover:bg-accent/50",
        className,
      )}
    >
      <Button
        type="button"
        className="min-w-30 flex-1 cursor-pointer text-left"
        onClick={startRecording}
      >
        {displayKeys.length > 0 ? (
          <KbdGroup>
            {displayKeys.map((key, index) => (
              <Kbd key={`${key}-${index}`}>{key}</Kbd>
            ))}
          </KbdGroup>
        ) : (
          <span className="text-muted-foreground text-sm">
            {isRecording
              ? t("shortcut_recorder.recording")
              : (placeholder ?? t("shortcut_recorder.placeholder"))}
          </span>
        )}
      </Button>

      {recordedKeys.length > 0 && !isRecording && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
          onClick={clearShortcut}
        >
          <XIcon className="h-3.5 w-3.5" />
          <span className="sr-only">{t("shortcut_recorder.clear")}</span>
        </Button>
      )}

      {isRecording && (
        <span className="animate-pulse text-primary text-xs">
          {t("shortcut_recorder.status")}
        </span>
      )}
    </div>
  );
}
