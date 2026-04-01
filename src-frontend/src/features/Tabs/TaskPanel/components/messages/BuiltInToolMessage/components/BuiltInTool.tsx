import { ChevronDownIcon, LucideIcon } from "lucide-react";
import { RiskBadge, ToolError } from "@/components/ai-elements/tool";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCollapsed } from "../../../../hooks/use-collapsible-store";

type BuiltInToolContainerProps = {
  id: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function BuiltInToolContainer({
  id,
  children,
  defaultOpen = false,
}: BuiltInToolContainerProps) {
  const [collapsed, setCollapsed] = useCollapsed(id, !defaultOpen);
  return (
    <Collapsible
      open={!collapsed}
      onOpenChange={(open) => setCollapsed(!open)}
      defaultOpen={defaultOpen}
      className="group w-full rounded-md border visibility-auto"
    >
      {children}
    </Collapsible>
  );
}

type BuiltInToolHeaderProps = {
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
  risk?: {
    level?: number;
    reason?: string;
  };
} & MustOneOf<{
  title: string;
  children: React.ReactNode;
}>;

export function BuiltInToolHeader({
  className,
  icon: Icon,
  iconClassName,
  title,
  risk = {},
  children,
}: BuiltInToolHeaderProps) {
  return (
    <CollapsibleTrigger className={cn("sticky top-0 z-1 bg-card rounded-md flex w-full cursor-pointer items-center justify-between gap-4 p-3", className)}>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <Icon className={cn("size-4 text-muted-foreground shrink-0", iconClassName)} />
        {title && <span className="font-medium text-sm">{title}</span>}
        {children}
      </div>
      <div className="flex items-center gap-2">
        {(typeof risk.level === "number") && (
          <RiskBadge riskLevel={risk.level} riskReason={risk.reason} />
        )}
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </div>
    </CollapsibleTrigger>
  );
}

type BuiltInToolTitleProps = {
  title: string;
} & React.ComponentProps<"div">;

export function BuiltInToolTitle({ children, title, className, ...props }: BuiltInToolTitleProps) {
  return (
    <div className={cn("flex flex-1 items-center min-w-0", className)} {...props}>
      <span className="font-medium text-sm text-nowrap">{title}</span>
      {children}
    </div>
  );
}

export function BuiltInToolContent({ children, className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className={cn("selectable data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in", className)}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
}

export function BuiltInToolError({ className, ...props }: React.ComponentProps<typeof ToolError>) {
  return <ToolError className={cn("mx-4 mb-4", className)} {...props} />;
}

export function BuiltInToolFooter({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <>
      <Separator className="bg-border/60" />
      <div className={cn("flex justify-end gap-2 px-4 py-3", className)} {...props}>
        {children}
      </div>
    </>
  );
}

export function BuiltInToolAction({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button className={cn("h-8 px-3 text-sm", className)} type="button" {...props} />;
}
