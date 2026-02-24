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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Selection = string | number;

// ============================================================
// Context
// ============================================================

type SelectDialogContextValue<K> = {
  mode: "single" | "multi";
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedKeys: Set<K>;
  toggle: (key: K) => void;
  isSelected: (key: K) => boolean;
};

// biome-ignore lint/suspicious/noExplicitAny: use any to allow any key type
const SelectDialogContext = createContext<SelectDialogContextValue<any> | null>(
  null
);

function useSelectDialog<V extends Selection>() {
  const ctx = useContext<SelectDialogContextValue<V> | null>(
    SelectDialogContext
  );
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

export type SelectDialogProps<V extends Selection> = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} & (
  | {
      mode?: "single";
      value?: V;
      onValueChange?: (value: V) => void;
    }
  | {
      mode: "multi";
      value?: V[];
      onValueChange?: (value: V[]) => void;
    }
);

export function SelectDialog<V extends Selection>({
  children,
  open: controlledOpen,
  onOpenChange,
  mode = "single",
  value,
  onValueChange,
}: SelectDialogProps<V>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // Normalize value into a Set<string>
  const externalKeys = useMemo(() => {
    if (value === undefined) {
      return new Set<V>();
    }
    if (Array.isArray(value)) {
      return new Set(value);
    }
    return new Set([value]);
  }, [value]);

  // Internal draft state (for multi-select, commit on confirm)
  const [draftKeys, setDraftKeys] = useState<Set<V>>(externalKeys);

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
    (key: V) => {
      if (mode === "single") {
        // Single: commit immediately and close
        (onValueChange as ((v: V) => void) | undefined)?.(key);
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
    (key: V) => {
      if (mode === "single") {
        return externalKeys.has(key);
      }
      return draftKeys.has(key);
    },
    [mode, externalKeys, draftKeys]
  );

  // Expose commit / cancel for footer
  const ctx = useMemo<SelectDialogContextValue<V>>(
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

type SelectDialogContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function SelectDialogContent({
  children,
  className,
}: SelectDialogContentProps) {
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

type SelectDialogListProps = {
  children: React.ReactNode;
  className?: string;
};

export function SelectDialogList({
  children,
  className,
}: SelectDialogListProps) {
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

type SelectDialogGroupProps = {
  heading?: string;
  children: React.ReactNode;
};

export function SelectDialogGroup({
  heading,
  children,
}: SelectDialogGroupProps) {
  return <CommandGroup heading={heading}>{children}</CommandGroup>;
}

// ============================================================
// Item
// ============================================================

type SelectDialogItemProps<V extends Selection> = {
  value: V;
  children?: React.ReactNode;
  className?: string;
};

export function SelectDialogItem<V extends Selection>({
  value,
  children,
  className,
}: SelectDialogItemProps<V>) {
  const { toggle, isSelected } = useSelectDialog();
  const selected = isSelected(value);

  return (
    <CommandItem
      value={value.toString()}
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
// Skeleton
// ============================================================

export function SelectDialogSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

// ============================================================
// Footer (multi-select confirm / cancel)
// ============================================================

type SelectDialogFooterProps<V extends Selection> = {
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (keys: V[]) => void;
  onCancel?: () => void;
  children?: React.ReactNode;
};

export function SelectDialogFooter<V extends Selection>({
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  children,
}: SelectDialogFooterProps<V>) {
  const { mode, selectedKeys, setOpen } = useSelectDialog<V>();

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
    <DialogFooter className="flex justify-between! px-2 py-2">
      <div className="space-x-2">
        {children}
      </div>
      <div className="space-x-2">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          {cancelText}
        </Button>
        <Button size="sm" onClick={handleConfirm}>
          {confirmText}
        </Button>
      </div>
    </DialogFooter>
  );
}

export function SelectDialogFooterAction({
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { setOpen } = useSelectDialog();
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setOpen(false);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}
