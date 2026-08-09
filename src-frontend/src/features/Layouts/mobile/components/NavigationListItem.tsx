import type { ReactNode, Ref } from "react";
import { ActionableItemIcon } from "@/components/custom/item/ActionableItem";
import { Item, ItemActions } from "@/components/ui/item";
import { cn } from "@/lib/utils";

type NavigationListItemProps = {
  id?: string;
  index?: number;
  ref?: Ref<HTMLButtonElement>;
  icon: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

export function NavigationListItem({
  id,
  index,
  ref,
  icon,
  children,
  actions,
  disabled = false,
  onClick,
}: NavigationListItemProps) {
  const className = cn(
    "flex w-full min-w-0 flex-nowrap rounded-none border-x-0 border-t-0 text-left hover:bg-accent/60 active:bg-accent/70",
    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
  );

  if (actions !== undefined) {
    const trigger = (
      <button
        ref={ref}
        id={id}
        type="button"
        data-index={index}
        disabled={disabled}
        onClick={onClick}
        className="group/item flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <ActionableItemIcon>{icon}</ActionableItemIcon>
        {children}
      </button>
    );

    return (
      <Item variant="outline" size="sm" className={className}>
        {trigger}
        <ItemActions className="shrink-0">{actions}</ItemActions>
      </Item>
    );
  }

  return (
    <Item asChild variant="outline" size="sm" className={className}>
      <button
        ref={ref}
        id={id}
        type="button"
        data-index={index}
        disabled={disabled}
        onClick={onClick}
      >
        <ActionableItemIcon>{icon}</ActionableItemIcon>
        {children}
      </button>
    </Item>
  );
}
