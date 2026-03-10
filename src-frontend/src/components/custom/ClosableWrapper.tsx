import { XIcon } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

type ClosableWrapperProps = {
  children: ReactNode;
  onClose?: () => void;
  defaultVisible?: boolean;
};

export function ClosableWrapper({
  children,
  onClose,
  defaultVisible = false,
}: ClosableWrapperProps) {
  return (
    <div className="relative group/closable-wrapper">
      {children}
      <Button
        type="button"
        onClick={onClose}
        variant="ghost"
        size="icon-sm"
        className={cn(
          "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded-full p-0 bg-accent/70 dark:hover:bg-accent",
          "group-hover/closable-wrapper:opacity-100 transition-opacity",
          {"opacity-0": !defaultVisible, "opacity-60": defaultVisible},
        )}
      >
        <XIcon />
      </Button>
    </div>
  );
}
