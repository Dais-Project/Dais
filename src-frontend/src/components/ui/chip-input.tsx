import * as React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { COMPONENTS_UI_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";
import { i18n } from "@/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChipInputProps {
  /** Controlled value */
  value?: string[];
  /** Default value for uncontrolled usage */
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  /** Disable duplicate entries (default: true) */
  unique?: boolean;
  disabled?: boolean;
  className?: string;
  /** Max number of chips allowed */
  max?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChipInput({
  value: controlledValue,
  defaultValue = [],
  onChange,
  placeholder = i18n.t("chip_input.placeholder", { ns: COMPONENTS_UI_NAMESPACE }),
  unique = true,
  disabled = false,
  className,
  max,
}: ChipInputProps) {
  const { t } = useTranslation(COMPONENTS_UI_NAMESPACE);
  const isControlled = controlledValue !== undefined;
  const [internalChips, setInternalChips] = React.useState<string[]>(defaultValue);
  const chips = isControlled ? controlledValue! : internalChips;

  const [draft, setDraft] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const setChips = React.useCallback(
    (next: string[]) => {
      if (!isControlled) {
        setInternalChips(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const addChip = React.useCallback(
    (raw: string) => {
      const val = raw.trim();
      if (!val) return;
      if (unique && chips.includes(val)) {
        setDraft("");
        return;
      }
      if (max !== undefined && chips.length >= max) return;
      setChips([...chips, val]);
      setDraft("");
    },
    [chips, unique, max, setChips]
  );

  const removeChip = React.useCallback(
    (index: number) => {
      const next = chips.filter((_, i) => i !== index);
      setChips(next);
    },
    [chips, setChips]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      addChip(draft);
      return;
    }
    if (e.key === "Backspace" && draft === "" && chips.length > 0) {
      removeChip(chips.length - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Auto-commit on trailing space
    if (v.endsWith(" ")) {
      addChip(v);
    } else {
      setDraft(v);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    // Support pasting multiple params separated by newlines, spaces, or commas
    const items = text.split(/[\n\r,]+/).map((s) => s.trim()).filter(Boolean);
    if (items.length > 1) {
      e.preventDefault();
      const deduped = unique
        ? items.filter((item) => !chips.includes(item))
        : items;
      const limited =
        max !== undefined ? deduped.slice(0, max - chips.length) : deduped;
      setChips([...chips, ...limited]);
    }
  };

  const isAtMax = max !== undefined && chips.length >= max;

  return (
    <div
      ref={containerRef}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        // Base
        "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm",
        // Focus ring – mirrors shadcn's ring style
        "ring-offset-background transition-colors",
        {
          "outline-none ring-2 ring-ring ring-offset-2": focused,
          "cursor-not-allowed opacity-50": disabled,
          "cursor-text": !disabled,
        },
        className
      )}
    >
      {/* Chips */}
      {chips.map((chip, i) => (
        <ChipItem
          key={`${chip}-${i}`}
          label={chip}
          disabled={disabled}
          onRemove={() => removeChip(i)}
          removeAriaLabel={t("chip_input.remove_aria", { label: chip })}
        />
      ))}

      {/* Input */}
      {!isAtMax && (
        <input
          ref={inputRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Commit any pending draft on blur
            if (draft.trim()) addChip(draft);
          }}
          disabled={disabled}
          placeholder={chips.length === 0 ? placeholder : undefined}
          className={cn(
            "min-w-40 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed font-mono text-xs"
          )}
        />
      )}

      {/* Max cap hint */}
      {isAtMax && (
        <span className="ml-1 text-xs text-muted-foreground">
          {t("chip_input.max_hint", { max })}
        </span>
      )}
    </div>
  );
}

// ─── Chip Item ────────────────────────────────────────────────────────────────

interface ChipItemProps {
  label: string;
  disabled?: boolean;
  onRemove: () => void;
  removeAriaLabel: string;
}

function ChipItem({ label, disabled, onRemove, removeAriaLabel }: ChipItemProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-xs font-normal",
        "select-none transition-colors",
        !disabled && "pr-1"
      )}
    >
      <span className="text-primary">{label}</span>
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "ml-0.5 rounded-sm p-0.5 text-muted-foreground",
            "hover:bg-destructive/20 hover:text-destructive",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            "transition-colors"
          )}
          aria-label={removeAriaLabel}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
