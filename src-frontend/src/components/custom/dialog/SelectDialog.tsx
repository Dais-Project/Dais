// components/ui/select-dialog/select-dialog.tsx
import { CheckIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ============================================================
// Context
// ============================================================

type SelectDialogContextValue = {
  mode: "single" | "multi";
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedKeys: Set<string>;
  toggle: (key: string) => void;
  isSelected: (key: string) => boolean;
};

const SelectDialogContext = createContext<SelectDialogContextValue | null>(
  null
);

function useSelectDialog() {
  const ctx = useContext(SelectDialogContext);
  if (!ctx) {
    throw new Error(
      "SelectDialog compound components must be used within <SelectDialog>"
    );
  }
  return ctx;
}

// ============================================================
// Root
// ============================================================

export type SelectDialogProps = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} & (
  | {
      mode?: "single";
      value?: string;
      onValueChange?: (value: string) => void;
    }
  | {
      mode: "multi";
      value?: string[];
      onValueChange?: (value: string[]) => void;
    }
);

export function SelectDialog({
  children,
  open: controlledOpen,
  onOpenChange,
  mode = "single",
  value,
  onValueChange,
}: SelectDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // Normalize value into a Set<string>
  const externalKeys = useMemo(() => {
    if (value === undefined) {
      return new Set<string>();
    }
    if (Array.isArray(value)) {
      return new Set(value);
    }
    return new Set([value]);
  }, [value]);

  // Internal draft state (for multi-select, commit on confirm)
  const [draftKeys, setDraftKeys] = useState<Set<string>>(externalKeys);

  // Sync draft when dialog opens
  const prevOpen = useRef(open);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setDraftKeys(externalKeys);
    }
    prevOpen.current = open;
  }, [open, externalKeys]);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const toggle = useCallback(
    (key: string) => {
      if (mode === "single") {
        // Single: commit immediately and close
        (onValueChange as ((v: string) => void) | undefined)?.(key);
        setOpen(false);
      } else {
        // Multi: update draft
        setDraftKeys((prev) => {
          const next = new Set(prev);
          if (next.has(key)) {
            next.delete(key);
          } else {
            next.add(key);
          }
          return next;
        });
      }
    },
    [mode, onValueChange, setOpen]
  );

  const isSelected = useCallback(
    (key: string) => {
      if (mode === "single") {
        return externalKeys.has(key);
      }
      return draftKeys.has(key);
    },
    [mode, externalKeys, draftKeys]
  );

  // Expose commit / cancel for footer
  const ctx = useMemo<SelectDialogContextValue>(
    () => ({
      mode,
      open,
      setOpen,
      selectedKeys: mode === "single" ? externalKeys : draftKeys,
      toggle,
      isSelected,
    }),
    [mode, open, setOpen, externalKeys, draftKeys, toggle, isSelected]
  );

  return (
    <SelectDialogContext.Provider value={ctx}>
      <Dialog open={open} onOpenChange={setOpen}>
        {children}
      </Dialog>
    </SelectDialogContext.Provider>
  );
}

// ============================================================
// Trigger
// ============================================================

export function SelectDialogTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DialogTrigger asChild>{children}</DialogTrigger>;
}

// ============================================================
// Content (wraps DialogContent + Command)
// ============================================================

export function SelectDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogContent
      showCloseButton={false}
      className={cn("gap-0 bg-popover p-0", className)}
    >
      <Command>{children}</Command>
    </DialogContent>
  );
}

// ============================================================
// Search
// ============================================================

export function SelectDialogSearch({
  placeholder = "Search...",
}: {
  placeholder?: string;
}) {
  return <CommandInput placeholder={placeholder} />;
}

// ============================================================
// List
// ============================================================

export function SelectDialogList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CommandList className={cn("shadcn-scroll", className)}>
      {children}
    </CommandList>
  );
}

// ============================================================
// Empty
// ============================================================

export function SelectDialogEmpty({
  children = "No results found.",
}: {
  children?: React.ReactNode;
}) {
  return <CommandEmpty>{children}</CommandEmpty>;
}

// ============================================================
// Group
// ============================================================

export function SelectDialogGroup({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  return <CommandGroup heading={heading}>{children}</CommandGroup>;
}

// ============================================================
// Item
// ============================================================

export function SelectDialogItem({
  value,
  children,
  className,
}: {
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { toggle, isSelected } = useSelectDialog();
  const selected = isSelected(value);

  return (
    <CommandItem
      value={value}
      onSelect={() => toggle(value)}
      className={className}
    >
      <CheckIcon
        className={cn("mr-2 size-4", selected ? "opacity-100" : "opacity-0")}
      />
      {children ?? value}
    </CommandItem>
  );
}

// ============================================================
// Separator
// ============================================================

export function SelectDialogSeparator() {
  return <CommandSeparator />;
}

// ============================================================
// Footer (multi-select confirm / cancel)
// ============================================================

export function SelectDialogFooter({
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: {
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (keys: string[]) => void;
  onCancel?: () => void;
}) {
  const { mode, selectedKeys, setOpen } = useSelectDialog();

  if (mode === "single") {
    console.warn("SelectDialogFooter should only be used in multi-select mode");
    return null;
  }

  const handleConfirm = () => {
    onConfirm?.(Array.from(selectedKeys));
    setOpen(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <DialogFooter className="px-2 py-4">
      <Button variant="outline" size="sm" onClick={handleCancel}>
        {cancelText}
      </Button>
      <Button size="sm" onClick={handleConfirm}>
        {confirmText}
      </Button>
    </DialogFooter>
  );
}
