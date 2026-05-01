import { useDebounce } from "ahooks";
import { AtSignIcon, FileIcon, FolderIcon } from "lucide-react";
import { useImperativeHandle, useState } from "react";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { useListDirectorySuspense, listDirectory, useSearchFile } from "@/api/tasks";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { LazyFileTree } from "@/components/custom/LazyFileTree";
import { Command, CommandEmpty, CommandLoading, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { keepPreviousData } from "@tanstack/react-query";

type OnSelectHandler = (path: string) => void;

type FileTreeSuspenseProps = {
  workspaceId: number;
  onSelect?: OnSelectHandler;
};

function FileTreeSuspense({ workspaceId, onSelect }: FileTreeSuspenseProps) {
  const { data: rootItems } = useListDirectorySuspense({ workspace_id: workspaceId });
  return (
    <LazyFileTree
      className="border-none p-0"
      rootNodes={rootItems.items}
      onSelect={onSelect}
      loadChildren={async (path) => {
        const result = await listDirectory({ workspace_id: workspaceId, path: path });
        return result.items;
      }}
    />
  );
}

type SearchResultsProps = {
  query: string;
  workspaceId: number;
  onSelect?: OnSelectHandler;
};

function SearchResults({ query, workspaceId, onSelect }: SearchResultsProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { data, isLoading } = useSearchFile(
    { workspace_id: workspaceId, query },
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

type FilesMenuProps = {
  workspaceId: number;
  onSelect?: OnSelectHandler;
};

function FilesMenu({ workspaceId, onSelect }: FilesMenuProps) {
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
          <SearchResults query={debouncedQuery} workspaceId={workspaceId} onSelect={onSelect} />
        ) : (
          <AsyncBoundary
            skeleton={(
              <div className="p-3 text-muted-foreground text-sm">
                {t("prompt.context.loading")}
              </div>
            )}
          >
            <FileTreeSuspense workspaceId={workspaceId} onSelect={onSelect} />
          </AsyncBoundary>
        )}
      </CommandList>
    </Command>
  )
}

export type ContextSelectPopoverRef = {
  open: () => void;
};

export type ContextSelectPopoverProps = {
  workspaceId: number;
  ref?: React.Ref<ContextSelectPopoverRef>;
  onSelect?: OnSelectHandler;
  onClose?: () => void;
};

export function ContextSelectPopover({
  workspaceId,
  onSelect,
  ref,
  onClose,
}: ContextSelectPopoverProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const [open, setOpen] = useState(false);
  const handleSelect = (path: string) => {
    onSelect?.(path);
    setOpen(false);
  };
  const handleOpenChange = (open_: boolean) => {
    if (!open_) {
      onClose?.();
    }
    setOpen(open_);
  };
  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
  }));
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <PromptInputButton
          variant="outline"
          tooltip={{
            content: t("prompt.context.trigger_tooltip"),
            align: "start"
          }}
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
        <FilesMenu workspaceId={workspaceId} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
