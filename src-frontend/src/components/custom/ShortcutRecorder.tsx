import { useCallback, useEffect, useRef, useState } from "react";
import { useRecordHotkeys } from "react-hotkeys-hook";
import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { COMPONENTS_CUSTOM_NAMESPACE } from "@/i18n/resources";
import { ButtonGroup } from "../ui/button-group";

type ShortcutRecorderProps = {
  value?: string[];
  onChange?: (keys: string[]) => void;
  placeholder?: string;
};

export function ShortcutRecorder({
  value = [],
  onChange,
  placeholder,
}: ShortcutRecorderProps) {
  const { t } = useTranslation(COMPONENTS_CUSTOM_NAMESPACE);
  const [recordedKeys, setRecordedKeys] = useState<string[]>(value);
  const [keys, { start, stop, resetKeys, isRecording }] = useRecordHotkeys();
  const containerRef = useRef<HTMLDivElement>(null);

  const submitRecordedKeys = useCallback(() => {
    stop();
    const keysArr = Array.from(keys);
    resetKeys();
    if (keysArr.length > 0) {
      setRecordedKeys(keysArr);
      onChange?.(keysArr);
    }
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
    <ButtonGroup ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        onClick={!isRecording ? startRecording : undefined}
      >
        {displayKeys.length > 0 ? (
          <KbdGroup>
            {displayKeys.map((key, index) => (
              <Kbd className="text-sm-plus!" key={`${key}-${index}`}>
                {key}
              </Kbd>
            ))}
          </KbdGroup>
        ) : (
          <span className="text-sm text-muted-foreground">
            {isRecording
              ? t("shortcut_recorder.recording")
              : (placeholder ?? t("shortcut_recorder.placeholder"))}
          </span>
        )}
      </Button>
      <Button
        variant="outline"
        className="text-muted-foreground"
        onClick={!isRecording ? clearShortcut : undefined}
      >
        <XIcon />
        <span className="sr-only">{t("shortcut_recorder.clear")}</span>
      </Button>
    </ButtonGroup>
  );
}
