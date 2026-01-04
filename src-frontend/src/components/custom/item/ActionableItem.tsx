import { MoreHorizontalIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";

type ActionableItemContextValue = {
  onTriggerMenu: (e: React.MouseEvent) => void;
};

const ActionableItemContext =
  React.createContext<ActionableItemContextValue | null>(null);

type ActionableItemProps = {
  children: React.ReactNode;
};

export function ActionableItem({ children }: ActionableItemProps) {
  const onTriggerMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const trigger = e.currentTarget;
    const rect = trigger.getBoundingClientRect();
    const triggerX = rect.left;
    const triggerY = rect.bottom + 4;
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: triggerX,
      clientY: triggerY,
    });
    e.currentTarget.dispatchEvent(event);
  };

  return (
    <ContextMenu>
      <ActionableItemContext.Provider value={{ onTriggerMenu }}>
        {children}
      </ActionableItemContext.Provider>
    </ContextMenu>
  );
}

export const ActionableItemIcon = ItemMedia;

type ActionableItemTriggerProps = {
  children: React.ReactNode;
  onClick?: () => void;
};

export function ActionableItemTrigger({
  children,
  onClick,
}: ActionableItemTriggerProps) {
  const context = React.useContext(ActionableItemContext);
  if (!context) {
    throw new Error("ActionableItemTrigger must be used within ActionableItem");
  }

  return (
    <ContextMenuTrigger asChild>
      <Item
        variant="outline"
        size="sm"
        className="group flex cursor-default flex-nowrap rounded-none border-x-0 border-t-0 hover:bg-accent/30"
        onClick={onClick}
      >
        {children}

        <ItemActions>
          <ActionableItemMenuButton />
        </ItemActions>
      </Item>
    </ContextMenuTrigger>
  );
}

type ActionableItemInfoProps = {
  title: string;
  description?: string;
};

export function ActionableItemInfo({
  title,
  description,
}: ActionableItemInfoProps) {
  return (
    <ItemContent>
      <ItemTitle>{title}</ItemTitle>
      {description && <ItemDescription>{description}</ItemDescription>}
    </ItemContent>
  );
}

export function ActionableItemMenuButton({
  className,
}: {
  className?: string;
}) {
  const context = React.useContext(ActionableItemContext);
  if (!context) {
    throw new Error(
      "ActionableItemMenuButton must be used within ActionableItem"
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("opacity-30 group-hover:opacity-100", className)}
      onClick={context.onTriggerMenu}
    >
      <MoreHorizontalIcon className="size-4" />
    </Button>
  );
}

export const ActionableItemMenu = ContextMenuContent;

export const ActionableItemMenuItem = ContextMenuItem;
