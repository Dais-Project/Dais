import { useListDirectorySuspense, listDirectory, useSearchFile } from "@/api/task";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { LazyFileTree } from "@/components/custom/LazyFileTree";
import { Command, CommandEmpty, CommandLoading, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useDebounce } from "ahooks";
import { AtSignIcon, FileIcon } from "lucide-react";
import { useState } from "react";

type OnSelectHandler = (path: string) => void;

function FileTreeSuspense({ onSelect }: { onSelect?: OnSelectHandler }) {
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
      rootNodes={rootItems.items}
      onSelect={handleSelect}
      loadChildren={async (path) => {
        const result = await listDirectory({ workspace_id: currentWorkspace.id, path: path });
        return result.items;
      }}
    />
  );
}

type SearchResultsProps = {
  query: string;
  onSelect?: OnSelectHandler;
};

function SearchResults({ query, onSelect }: SearchResultsProps) {
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  if (currentWorkspace === null) {
    return null;
  }
  const debouncedQuery = useDebounce(query, { wait: 200 });
  const { data, isLoading } = useSearchFile({ workspace_id: currentWorkspace.id, query: debouncedQuery });
  if (isLoading) {
    return <CommandLoading>Loading...</CommandLoading>;
  }
  if (data === undefined || data.items.length === 0) {
    return <CommandEmpty>No results found.</CommandEmpty>;
  }
  return (
    <>
      {data.items.map((item) => (
        <CommandItem key={item.path} value={item.path} onSelect={onSelect}>
          <FileIcon />
          <span className="font-medium text-sm">{item.name}</span>
          <span className="text-muted-foreground text-xs">{item.path}</span>
        </CommandItem>
      ))}
    </>
  );
}

function FilesMenu({ onSelect }: { onSelect?: OnSelectHandler }) {
  const [query, setQuery] = useState("");
  const isSearching = query.length > 0;

  return (
    <Command shouldFilter={false}>
      <CommandInput
        className="border-none focus-visible:ring-0"
        placeholder="Add files, folders, docs..."
        value={query} onValueChange={setQuery}
      />
      <CommandList className="p-1">
        {isSearching ? (
          <SearchResults query={query} />
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

export function ContextSelectPopover({ onSelect }: { onSelect?: OnSelectHandler }) {
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
