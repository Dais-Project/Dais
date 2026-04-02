import { ChevronsDownUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useCollapsibleStore } from "../hooks/use-collapsible-store";

export function CollapseAllButton() {
  const collapseAll = useCollapsibleStore((store) => store.collapseAll);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={collapseAll}
          aria-label="Collapse all messages"
        >
          <ChevronsDownUpIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        align="end"
        side="bottom"
      >
        Collapse all messages
      </TooltipContent>
    </Tooltip>
  );
}

