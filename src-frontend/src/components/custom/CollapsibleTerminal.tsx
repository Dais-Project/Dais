import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from "@/components/ai-elements/terminal";
import { CopyButton } from "../ui/copy-button";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type ActiveOutputProps = {
  showStderr: boolean;
  setShowStderr: (showStderr: boolean) => void;
};

function ActiveOutputSwitch({ showStderr, setShowStderr }: ActiveOutputProps) {
  const currentValue = showStderr ? "stderr" : "stdout";
  const handleValueChange = (value: string) => {
    if (value === "stderr") {
      setShowStderr(true);
    } else {
      setShowStderr(false);
    }
  };
  return (
    <ToggleGroup
      type="single"
      value={currentValue}
      onValueChange={handleValueChange}
      onClick={(e) => e.stopPropagation()}
    >
      <ToggleGroupItem className="h-7 px-2 text-xs font-normal" value="stdout">stdout</ToggleGroupItem>
      <ToggleGroupItem className="h-7 px-2 text-xs font-normal" value="stderr">stderr</ToggleGroupItem>
    </ToggleGroup>
  );
}

export type CollapsibleTerminalProps = {
  input: string;
  stdout: string | null;
  stderr: string | null;
  children?: React.ReactNode;
  isStreaming?: boolean;
  autoScroll?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  title?: string;
  className?: string;
};

export function CollapsibleTerminal({
  input,
  stdout,
  stderr,
  children,
  isStreaming = false,
  autoScroll = true,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  title,
  className,
}: CollapsibleTerminalProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const [showStderr, setShowStderr] = useState(false);

  const activeOutput = (showStderr || stdout === null) ? stderr : stdout;
  const composedOutput = `\u001b[0m$ ${input}\n${activeOutput}`;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <Terminal
      output={composedOutput}
      isStreaming={isStreaming}
      autoScroll={autoScroll}
      className={cn("dark", className)}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <TerminalHeader className="sticky top-0 z-1 cursor-pointer">
            <TerminalTitle>{title}</TerminalTitle>
            {stderr && stdout && <ActiveOutputSwitch showStderr={showStderr} setShowStderr={setShowStderr} />}

            <TerminalStatus />
            <TerminalActions>
              <CopyButton
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                content={activeOutput ?? ""}
                onClick={(e) => e.stopPropagation()}
              />
              <ChevronDownIcon
                size={16}
                className={cn("transition-transform", open ? "rotate-0" : "-rotate-90")}
              />
            </TerminalActions>
          </TerminalHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <TerminalContent className="shadcn-scroll selectable pt-2" />
          {children}
        </CollapsibleContent>
      </Collapsible>
    </Terminal>
  );
}
