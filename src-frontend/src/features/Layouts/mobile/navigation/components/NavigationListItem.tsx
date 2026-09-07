import type { ReactNode, Ref } from "react";
import { ActionableItemIcon } from "@/components/custom/item/ActionableItem";
import { Item, ItemActions } from "@/components/ui/item";
import { cn } from "@/lib/utils";

type NavigationListItemProps = {
  id?: string;
  index?: number;
  className?: string;
  triggerClassName?: string;
  ref?: Ref<HTMLDivElement>;
  icon: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

export function NavigationListItem({
  id,
  index,
  className,
  triggerClassName,
  ref,
  icon,
  children,
  actions,
  disabled = false,
  onClick,
}: NavigationListItemProps) {
  return (
    <Item
      ref={ref}
      data-index={index}
      variant="outline"
      size="sm"
      className={cn(
        "w-full min-w-0 flex-nowrap gap-0 rounded-none border-x-0 border-t-0 p-0",
        className,
      )}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-4 py-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-accent/70",
          disabled && "cursor-not-allowed opacity-60",
          triggerClassName,
        )}
      >
        <ActionableItemIcon>{icon}</ActionableItemIcon>
        {children}
      </button>
      {actions !== undefined && (
        <ItemActions className="shrink-0 pr-4">{actions}</ItemActions>
      )}
    </Item>
  );
}
