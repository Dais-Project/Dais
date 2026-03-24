import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KeyValuePair = {
  id: string;
  key: string;
  value: string;
};

export type KeyValueEditorProps = {
  value?: KeyValuePair[];
  defaultValue?: KeyValuePair[];
  onChange?: (pairs: KeyValuePair[]) => void;
  disabled?: boolean;
  className?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function makePair(key = "", value = ""): KeyValuePair {
  return { id: Date.now().toString() + Math.random(), key, value };
}

/** Convert pairs array → plain object (for form submission) */
export function headersToObject(pairs: KeyValuePair[]): Record<string, string> {
  return pairs
    .filter((p) => p.key.trim())
    .reduce((acc, p) => ({ ...acc, [p.key.trim()]: p.value }), {});
}

/** Convert plain object → pairs array (for initializing from saved config) */
export function objectToHeaders(obj: Record<string, string>): KeyValuePair[] {
  return Object.entries(obj).map(([key, value]) => makePair(key, value));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeyValueEditor({
  value: controlledValue,
  defaultValue,
  onChange,
  disabled = false,
  className,
}: KeyValueEditorProps) {
  const isControlled = controlledValue !== undefined;
  const [internalPairs, setInternalPairs] = useState<KeyValuePair[]>(
    () => defaultValue ?? [makePair()]
  );

  const pairs = isControlled ? controlledValue! : internalPairs;

  const setPairs = (next: KeyValuePair[]) => {
    if (!isControlled) {
      setInternalPairs(next)
    };
    onChange?.(next);
  };

  const addPair = () => setPairs([...pairs, makePair()]);

  const removePair = (id: string) => {
    if (pairs.length > 1) {
      setPairs(pairs.filter((p) => p.id !== id));
    }
  };

  const updatePair = (id: string, field: "key" | "value", newValue: string) => {
    setPairs(pairs.map((p) => (p.id === id ? { ...p, [field]: newValue } : p)));
  };

  return (
    <div className={cn("space-y-2", className)}>

      {/* Column labels */}
      <div className="flex items-center gap-2">
        <Label className="flex-1 text-xs font-medium text-muted-foreground pl-3">Key</Label>
        <Label className="flex-1 text-xs font-medium text-muted-foreground pl-3">Value</Label>
        <Button
          type="button"
          variant="outline"
          onClick={addPair}
          disabled={disabled}
          size="icon"
          className="shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {pairs.map((pair) => (
          <div key={pair.id} className="flex items-center gap-2">
            <Input
              placeholder="Key-Name"
              value={pair.key}
              onChange={(e) => updatePair(pair.id, "key", e.target.value)}
              disabled={disabled}
              className="flex-1 font-mono text-sm"
            />
            <Input
              placeholder="value"
              value={pair.value}
              onChange={(e) => updatePair(pair.id, "value", e.target.value)}
              disabled={disabled}
              className="flex-1 font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removePair(pair.id)}
              disabled={disabled || pairs.length === 1}
              className="shrink-0"
              aria-label="删除此行"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}