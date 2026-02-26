import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AtSignIcon, GlobeIcon } from "lucide-react";
import { useState } from "react";

function FilesMenu({ onSelect }: { onSelect?: (path: string) => void }) {
  return (
    <Command>
      <CommandInput
        className="border-none focus-visible:ring-0"
        placeholder="Add files, folders, docs..."
      />
      <CommandList className="p-1">
        <CommandEmpty className="p-3 text-muted-foreground text-sm">
          No results found.
        </CommandEmpty>

        <CommandItem >
          <GlobeIcon className="text-primary" />
          <span className="font-medium text-sm">Test.tsx</span>
        </CommandItem>
      </CommandList>
    </Command>
  )
}

export function ContextSelectPopover({ onSelect }: { onSelect?: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PromptInputButton
          onClick={() => setOpen((prev) => !prev)}
          variant="outline"
          tooltip="Add files, folders, docs..."
        >
          <AtSignIcon className="text-muted-foreground" size={12} />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-100 p-0">
        <FilesMenu />
      </PopoverContent>
    </Popover>
  );
}
