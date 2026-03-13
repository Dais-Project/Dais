import { useDebounce } from "ahooks";
import { AtSignIcon, FileIcon, FolderIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { useListDirectorySuspense, listDirectory, useSearchFile } from "@/api/task";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { LazyFileTree } from "@/components/custom/LazyFileTree";
import { Command, CommandEmpty, CommandLoading, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { keepPreviousData } from "@tanstack/react-query";

type OnSelectHandler = (path: string) => void;

function FileTreeSuspense({ onSelect }: { onSelect?: OnSelectHandler }) {
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  if (currentWorkspace === null) {
    return null;
  }
  const { data: rootItems } = useListDirectorySuspense({ workspace_id: currentWorkspace.id });
  return (
    <LazyFileTree
      className="border-none p-0"
      rootNodes={rootItems.items}
      onSelect={onSelect}
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
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  if (currentWorkspace === null) {
    return null;
  }
  const { data, isLoading } = useSearchFile(
    { workspace_id: currentWorkspace.id, query },
    { query: { placeholderData: keepPreviousData } },
  );
  if (isLoading && data === undefined) {
    return <CommandLoading>{t("prompt.context.loading")}</CommandLoading>;
  }
  if (data === undefined || data.items.length === 0) {
    return <CommandEmpty>{t("prompt.context.no_results")}</CommandEmpty>;
  }
  return (
    <>
      {data.items.map((item) => (
        <CommandItem
          className="grid grid-cols-[auto_1fr] grid-rows-2 gap-x-1 gap-y-0 items-center"
          key={item.path}
          value={item.path}
          onSelect={onSelect}
        >
          <div className="mt-0.5">
            {item.type === "file" ? <FileIcon /> : <FolderIcon />}
          </div>
          <div className="font-medium text-sm">{item.name}</div>
          <div className="col-start-2 text-muted-foreground text-xs truncate">{item.path}</div>
        </CommandItem>
      ))}
    </>
  );
}

function FilesMenu({ onSelect }: { onSelect?: OnSelectHandler }) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, { wait: 150 });
  const isSearching = query.length > 0;

  return (
    <Command shouldFilter={false}>
      <CommandInput
        className="border-none focus-visible:ring-0"
        placeholder={t("prompt.context.search_placeholder")}
        value={query} onValueChange={setQuery}
      />
      <CommandList className="p-1">
        {isSearching ? (
          <SearchResults query={debouncedQuery} onSelect={onSelect} />
        ) : (
          <AsyncBoundary
            skeleton={(
              <div className="p-3 text-muted-foreground text-sm">
                {t("prompt.context.loading")}
              </div>
            )}
          >
            <FileTreeSuspense onSelect={onSelect} />
          </AsyncBoundary>
        )}
      </CommandList>
    </Command>
  )
}

export function contextFileConcat(current: string, path: string): string {
  if (current.length === 0) {
    return path;
  }
  if (current.endsWith("\n") || current.endsWith(" ")) {
    return current + path;
  }
  return current + " " + path;
}

export function ContextSelectPopover({ onSelect }: { onSelect?: OnSelectHandler }) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
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
          tooltip={t("prompt.context.trigger_tooltip")}
        >
          <AtSignIcon className="text-muted-foreground" size={12} />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent
        side="top"
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
