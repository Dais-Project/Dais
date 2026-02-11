import { CheckIcon } from "lucide-react";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type BaseSelectDialogProps<Selection> = {
  children: React.ReactNode;
  value?: Selection;
  isSelected?: (selection: Selection) => boolean;
  getValue?: (selection: Selection) => string;
  getLabel?: (selection: Selection) => string;
  onSelect: (value: Selection) => void;
  onOpenChange?: (open: boolean) => void;
  emptyText?: string;
  placeholder?: string;
};

type SingleSelectDialogProps<Selection> = BaseSelectDialogProps<Selection> & {
  selections: Selection[];
};

export function SingleSelectDialog<Selection>({
  children,
  value,
  isSelected,
  selections,
  getValue = (selection: Selection) => selection as string,
  getLabel,
  onSelect,
  onOpenChange,
  placeholder = "Search...",
  emptyText = "No results found.",
}: SingleSelectDialogProps<Selection>) {
  const [open, setOpen] = useState(false);

  const handleSelect = (selection: Selection) => {
    onSelect(selection);
    setOpen(false);
  };

  const handleOpenChange = (open_: boolean) => {
    setOpen(open_);
    onOpenChange?.(open_);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={false} className="p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList className="shadcn-scroll">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {selections.map((selection: Selection) => {
                const value_ = getValue(selection);
                const label = getLabel?.(selection) ?? value_;
                const isEqual =
                  isSelected?.(selection) ??
                  (value && getValue(value) === value_);
                return (
                  <CommandItem
                    key={value_}
                    value={value_}
                    onSelect={() => handleSelect(selection)}
                  >
                    <CheckIcon
                      className={cn("mr-2 size-4", {
                        "opacity-0": !isEqual,
                        "opacity-100": isEqual,
                      })}
                    />
                    {label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

type SelectionGroup<Selection> = {
  heading: string;
  items: Selection[];
};

type GroupedSingleSelectDialogProps<Selection> =
  BaseSelectDialogProps<Selection> & {
    groups: SelectionGroup<Selection>[];
  };

export function GroupedSingleSelectDialog<Selection>({
  children,
  value,
  isSelected,
  groups,
  getValue = (selection: Selection) => selection as string,
  getLabel,
  onSelect,
  onOpenChange,
  placeholder = "Search...",
  emptyText = "No results found.",
}: GroupedSingleSelectDialogProps<Selection>) {
  const [open, setOpen] = useState(false);

  const handleSelect = (selection: Selection) => {
    onSelect(selection);
    setOpen(false);
  };

  const handleOpenChange = (open_: boolean) => {
    setOpen(open_);
    onOpenChange?.(open_);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={false} className="p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList className="shadcn-scroll">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map((group, groupIndex) => (
              <div key={group.heading}>
                <CommandGroup heading={group.heading}>
                  {group.items.map((selection) => {
                    const value_ = getValue(selection);
                    const label = getLabel?.(selection) ?? value_;
                    const isEqual =
                      isSelected?.(selection) ??
                      (value && getValue(value) === value_);
                    return (
                      <CommandItem
                        key={value_}
                        value={value_}
                        onSelect={() => handleSelect(selection)}
                      >
                        <CheckIcon
                          className={cn("mr-2 size-4", {
                            "opacity-0": !isEqual,
                          })}
                        />
                        {label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                {groupIndex < groups.length - 1 && <CommandSeparator />}
              </div>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
