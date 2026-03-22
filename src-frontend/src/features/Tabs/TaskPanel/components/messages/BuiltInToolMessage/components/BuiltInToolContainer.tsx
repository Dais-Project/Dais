import { ChevronDownIcon } from "lucide-react";
import { Activity } from "react";
import { RiskBadge, type ToolState } from "@/components/ai-elements/tool";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { activityVisible } from "@/lib/activity-visible";
import { shouldShowConfirmation, ToolConfirmation } from "./ToolConfirmation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type BuiltInToolContainerProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  state?: ToolState;
  risk?: {
    level?: number;
    reason?: string;
  };
  defaultOpen?: boolean;
  onUserReviewed?: (approved: boolean) => void;
};

export function BuiltInToolContainer({
  icon,
  title,
  children,
  state,
  risk = {},
  defaultOpen = true,
  onUserReviewed,
}: BuiltInToolContainerProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group selectable-text w-full rounded-md border">
      <BuiltInToolHeader icon={icon} title={title} risk={risk} />
      {children}
      {state && (
        <Activity mode={activityVisible(shouldShowConfirmation(state))}>
          <ToolConfirmation
            state={state}
            onAccept={() => onUserReviewed?.(true)}
            onReject={() => onUserReviewed?.(false)}
          />
        </Activity>
      )}
    </Collapsible>
  );
}

type BuiltInToolHeaderProps = {
  title: string;
  icon: React.ReactNode;
  risk?: {
    level?: number;
    reason?: string;
  };
};

export function BuiltInToolHeader({ icon, title, risk = {} }: BuiltInToolHeaderProps) {
  return (
    <CollapsibleTrigger className="sticky top-0 z-1 bg-card rounded-md flex w-full cursor-pointer items-center justify-between gap-4 p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{title}</span>
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

export function BuiltInToolContent({ children, className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className={cn("data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in", className)}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
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
