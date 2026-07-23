import React, { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { useDebounceFn } from "ahooks";

export type ExpandableSearchBarProps = {
  expandDirection?: "left" | "right";
  placeholder?: string;
  onValueChange?: (query: string) => void;
  className?: string;
  defaultOpen?: boolean;
  width?: number;
};

// Match Button `size="icon"` (size-9) so this sits flush with SideBarHeader actions.
const COLLAPSED_SIZE = 36;
// Keep this in sync with the `duration-*` class / transitionDuration below.
const TRANSITION_MS = 260;

export function ExpandableSearchBar({
  expandDirection = "right",
  placeholder = "Search...",
  onValueChange,
  className = "",
  defaultOpen = false,
}: ExpandableSearchBarProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Whether the form is in the DOM at all.
  const [mounted, setMounted] = useState(defaultOpen);
  // Whether it's painted at its *expanded* width/opacity (drives the transition).
  const [expanded, setExpanded] = useState(defaultOpen);
  const [value, setValue] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIds = useRef<number[]>([]);

  const handleClear = () => {
    setValue("");
    onValueChange?.("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleOnChange.run(value);
  };

  const handleOnChange = useDebounceFn((next: string) => {
    onValueChange?.(next);
  }, { wait: 300 });

  // Mount/unmount + expand/collapse orchestration.
  // On open: mount immediately at the collapsed size, then flip to expanded
  // a couple of frames later so the browser has something to transition *from*.
  // On close: collapse immediately, then unmount once the transition ends.
  useEffect(() => {
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    rafIds.current.forEach(cancelAnimationFrame);
    rafIds.current = [];

    if (open) {
      setMounted(true);
      const id1 = requestAnimationFrame(() => {
        const id2 = requestAnimationFrame(() => setExpanded(true));
        rafIds.current.push(id2);
      });
      rafIds.current.push(id1);
    } else {
      setExpanded(false);
      unmountTimer.current = setTimeout(() => setMounted(false), TRANSITION_MS);
    }

    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      rafIds.current.forEach(cancelAnimationFrame);
      rafIds.current = [];
    };
  }, [open]);

  // Click outside to close (only when empty).
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node) && open && value === "") {
        setOpen(false);
        handleClear();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, value, onValueChange]);

  // Autofocus on open, clear value on close.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    } else {
      handleClear();
    }
  }, [open, onValueChange]);

  // Escape to close; Enter is handled by form submit.
  useHotkeys("esc", () => {
    setOpen(false);
    handleClear();
  }, {
    enabled: open,
    preventDefault: true,
    enableOnFormTags: true,
  });

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ width: expanded ? "100%" : COLLAPSED_SIZE, height: COLLAPSED_SIZE }}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={open ? "Close search" : "Open search"}
        onClick={() => setOpen((s) => !s)}
        className="absolute right-0 z-20 rounded-full bg-secondary hover:bg-secondary"
      >
        {open ? <XIcon className="size-4" /> : <SearchIcon className="size-4" />}
      </Button>

      {mounted && (
        <form
          onSubmit={handleSubmit}
          className={cn(
            "absolute top-0",
            "transition-[width,opacity] duration-260 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            expandDirection === "left" ? "right-0" : "left-0",
            expanded ? "opacity-100" : "opacity-0"
          )}
          style={{ width: expanded ? "100%" : COLLAPSED_SIZE }}
        >
          <InputGroup className="h-9 border-none overflow-hidden rounded-full">
            <InputGroupInput
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => {
                const next = e.target.value;
                setValue(next);
                if ((e.nativeEvent as InputEvent).isComposing) return;
                handleOnChange.run(next);
              }}
              onCompositionEnd={() => handleOnChange.run(value)}
              placeholder={placeholder}
              className="whitespace-nowrap overflow-x-auto"
            />
          </InputGroup>
        </form>
      )}
    </div>
  );
}
