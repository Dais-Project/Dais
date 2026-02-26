import { useListDirectorySuspense, listDirectory } from "@/api/task";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { LazyFileTree } from "@/components/custom/LazyFileTree";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AtSignIcon, FileIcon } from "lucide-react";
import { useState } from "react";

function FileTreeSuspense({ onSelect }: { onSelect?: (path: string) => void }) {
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  if (currentWorkspace === null) {
    return null;
  }
  const { data: rootItems } = useListDirectorySuspense({ workspace_id: currentWorkspace.id });
  const handleSelect = (path: string, type: "file" | "folder") => {
    if (type === "file") {
      onSelect?.(path);
    }
  };
  return (
    <LazyFileTree
      className="border-none p-0"
      rootNodes={rootItems}
      onSelect={handleSelect}
      loadChildren={(path) => listDirectory({ workspace_id: currentWorkspace.id, path: path })}
    />
  );
}

function FilesMenu({ onSelect }: { onSelect?: (path: string) => void }) {
  const [search, setSearch] = useState("");
  const isSearching = search.length > 0;

  return (
    <Command shouldFilter={isSearching ? undefined : false}>
      <CommandInput
        className="border-none focus-visible:ring-0"
        placeholder="Add files, folders, docs..."
        value={search} onValueChange={setSearch}
      />
      <CommandList className="p-1">
        {isSearching ? (
          <>
            <CommandEmpty className="p-3 text-muted-foreground text-sm">
              No results found.
            </CommandEmpty>
            <CommandItem >
              <FileIcon />
              <span className="font-medium text-sm">Test.tsx</span>
            </CommandItem>
          </>
        ) : (
          <AsyncBoundary
            skeleton={<div className="p-3 text-muted-foreground text-sm">Loading...</div>}
            errorDescription="Failed to load files."
          >
            <FileTreeSuspense onSelect={onSelect} />
          </AsyncBoundary>
        )}
      </CommandList>
    </Command>
  )
}

export function ContextSelectPopover({ onSelect }: { onSelect?: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const handleSelect = (path: string) => {
    onSelect?.(path);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PromptInputButton
          variant="outline"
          tooltip="Add files, folders, docs..."
        >
          <AtSignIcon className="text-muted-foreground" size={12} />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-100 p-0"
        // prevent focusing the trigger button to trigger tooltip after closing
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <FilesMenu onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
