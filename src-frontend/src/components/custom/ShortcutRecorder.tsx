import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type ShortcutRecorderProps = {
  value?: string[];
  onChange?: (keys: string[]) => void;
  placeholder?: string;
  className?: string;
};

function formatKeyName(key: string): string {
  const keyMap: Record<string, string> = {
    control: "Ctrl",
    ctrl: "Ctrl",
    meta: "⌘",
    command: "⌘",
    alt: "Alt",
    option: "⌥",
    shift: "Shift",
    enter: "Enter",
    return: "Enter",
    escape: "Esc",
    esc: "Esc",
    backspace: "⌫",
    delete: "Del",
    tab: "Tab",
    " ": "Space",
    space: "Space",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };

  const lowerKey = key.toLowerCase();
  return keyMap[lowerKey] || key.toUpperCase();
}

function getModifierPriority(key: string): number {
  const lowerKey = key.toLowerCase();
  if (lowerKey === "control" || lowerKey === "ctrl") return 1;
  if (lowerKey === "meta" || lowerKey === "command") return 2;
  if (lowerKey === "alt" || lowerKey === "option") return 3;
  if (lowerKey === "shift") return 4;
  return 5;
}

function sortKeys(keys: string[]): string[] {
  return [...keys].sort(
    (a, b) => getModifierPriority(a) - getModifierPriority(b),
  );
}

export function ShortcutRecorder({
  value = [],
  onChange,
  placeholder = "点击此处录制快捷键",
  className,
}: ShortcutRecorderProps) {
  const { t } = useTranslation("settings");
  const [isRecording, setIsRecording] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [recordedKeys, setRecordedKeys] = useState<string[]>(value);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecordedKeys(value);
  }, [value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isRecording) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nextSet = new Set(pressedKeysRef.current);
      nextSet.add(event.key);
      pressedKeysRef.current = nextSet;
      setPressedKeys(nextSet);
    },
    [isRecording],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!isRecording) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const currentKeys = Array.from(pressedKeysRef.current);
      if (currentKeys.length === 0) {
        return;
      }

      const sortedKeys = sortKeys(currentKeys);
      setRecordedKeys(sortedKeys);
      onChange?.(sortedKeys);
      setIsRecording(false);
      pressedKeysRef.current = new Set();
      setPressedKeys(new Set());
    },
    [isRecording, onChange],
  );

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isRecording, handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsRecording(false);
        pressedKeysRef.current = new Set();
        setPressedKeys(new Set());
      }
    };

    if (isRecording) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    pressedKeysRef.current = new Set();
    setPressedKeys(new Set());
  };

  const clearShortcut = () => {
    setRecordedKeys([]);
    onChange?.([]);
    setIsRecording(false);
    pressedKeysRef.current = new Set();
    setPressedKeys(new Set());
  };

  const displayKeys = isRecording
    ? sortKeys(Array.from(pressedKeys))
    : recordedKeys;

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
      <div
        className="min-w-[120px] flex-1 cursor-pointer"
        onClick={startRecording}
      >
        {displayKeys.length > 0 ? (
          <KbdGroup>
            {displayKeys.map((key, index) => (
              <Kbd key={`${key}-${index}`}>{formatKeyName(key)}</Kbd>
            ))}
          </KbdGroup>
        ) : (
          <span className="text-muted-foreground text-sm">
            {isRecording
              ? t("shortcuts.switchShortcuts.recording")
              : placeholder}
          </span>
        )}
      </div>

      {recordedKeys.length > 0 && !isRecording && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
          onClick={clearShortcut}
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">
            {t("shortcuts.switchShortcuts.clear")}
          </span>
        </Button>
      )}

      {isRecording && (
        <span className="animate-pulse text-primary text-xs">
          {t("shortcuts.switchShortcuts.status")}
        </span>
      )}
    </div>
  );
}
