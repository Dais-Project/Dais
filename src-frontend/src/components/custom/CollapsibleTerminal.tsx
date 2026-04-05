import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
  TerminalTitle,
} from "@/components/ai-elements/terminal";
import { CopyButton } from "../ui/copy-button";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type ActiveOutputProps = {
  value: "stdout" | "stderr";
  disabled?: boolean;
  onChange?: (value: "stdout" | "stderr") => void;
};

function ActiveOutputSwitch({
  value,
  disabled,
  onChange,
}: ActiveOutputProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      disabled={disabled}
      onValueChange={onChange}
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
  actions?: React.ReactNode;
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
  actions,
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

  const [currentOutput, setCurrentOutput] = useState<"stdout" | "stderr">("stdout");
  const activeOutput = (currentOutput === "stdout") ? stdout : stderr;
  const composedOutput = `\u001b[0m$ ${input}\n${activeOutput}`;

  useEffect(() => {
    if (!stdout && stderr) {
      setCurrentOutput("stderr");
    }
  }, [stdout, stderr]);

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
            <ActiveOutputSwitch
              value={currentOutput}
              disabled={!stdout || !stderr}
              onChange={setCurrentOutput}
            />
            <TerminalActions>
              {actions}
              <CopyButton
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                content={activeOutput ?? ""}
                onClick={(e) => e.stopPropagation()}
              />
              <ChevronDownIcon className={cn(
                "size-4 transition-transform",
                { "rotate-180": open }
              )} />
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
