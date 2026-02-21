import { ChevronDownIcon } from "lucide-react";
import { Activity } from "react";
import type { ToolState } from "@/components/ai-elements/tool";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { activityVisible } from "@/lib/activity-visible";
import { shouldShowConfirmation, ToolConfirmation } from "./ToolConfirmation";

type CustomToolProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  state?: ToolState;
  defaultOpen?: boolean;
  onUserReaction?: (approved: boolean) => void;
};

export function CustomTool({ icon, title, children, state, defaultOpen = true, onUserReaction }: CustomToolProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group selectable-text mb-4 w-full rounded-md border">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-4 p-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in">
        {children}
      </CollapsibleContent>
      {state && (
        <Activity mode={activityVisible(shouldShowConfirmation(state))}>
          <ToolConfirmation
            state={state}
            onAccept={() => onUserReaction?.(true)}
            onReject={() => onUserReaction?.(false)}
          />
        </Activity>
      )}
    </Collapsible>
  );
}
