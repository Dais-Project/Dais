import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SideBarHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function SideBarHeader({ title, children }: SideBarHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b py-2 pr-3 pl-4">
      <span className="h-8 font-medium text-sm leading-8">{title}</span>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

// --- --- --- --- --- ---

type SideBarHeaderActionProps = {
  Icon: LucideIcon;
  tooltip: string;
} & React.ComponentProps<typeof Button>;

export function SideBarHeaderAction({
  Icon,
  tooltip,
  ...props
}: SideBarHeaderActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" {...props}>
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

type SideBarHeaderDropdownActionProps = {
  children: React.ReactNode;
  Icon: LucideIcon;
  tooltip: string;
} & React.ComponentProps<typeof Button>;

export function SideBarHeaderDropdownAction({
  children,
  Icon,
  tooltip,
  ...props
}: SideBarHeaderDropdownActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" {...props}>
              <Icon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{children}</DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export const SideBarHeaderDropdownItem = DropdownMenuItem;
