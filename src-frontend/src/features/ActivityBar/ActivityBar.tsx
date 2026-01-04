import {
  BotMessageSquareIcon,
  FoldersIcon,
  HammerIcon,
  LayoutListIcon,
  SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebarStore, type View } from "@/stores/sidebar-store";

const topViews: { id: View; title: string; icon: React.ReactNode }[] = [
  {
    id: "tasks",
    title: "Tasks",
    icon: <LayoutListIcon />,
  },
  {
    id: "workspaces",
    title: "Workspaces",
    icon: <FoldersIcon />,
  },
  {
    id: "agents",
    title: "Agents",
    icon: <BotMessageSquareIcon />,
  },
  {
    id: "toolsets",
    title: "ToolSets",
    icon: <HammerIcon />,
  },
  // {
  //   id: "plugins",
  //   title: "Plugins",
  //   icon: <BlocksIcon />,
  // },
];

const bottomViews: { id: View; title: string; icon: React.ReactNode }[] = [
  {
    id: "settings",
    title: "Settings",
    icon: <SettingsIcon />,
  },
];

type ActivityBarItemProps = {
  id: View;
  icon: React.ReactNode;
} & React.ComponentProps<typeof Button>;

function ActivityBarItem({ id, icon, ...props }: ActivityBarItemProps) {
  const { activeView, isOpen, toggleSidebar } = useSidebarStore();

  return (
    <Button
      {...props}
      variant="ghost"
      size="icon"
      className={cn(
        "size-12 rounded-none border-transparent border-r-2 border-l-2 p-4 opacity-40 hover:opacity-100 [&_svg]:size-6!",
        activeView === id && isOpen && "border-l-primary opacity-100"
      )}
      onClick={() => toggleSidebar(id)}
    >
      {icon}
    </Button>
  );
}

export function ActivityBar() {
  const isOpen = useSidebarStore((state) => state.isOpen);
  return (
    <div
      className={cn(
        "flex flex-col justify-between bg-muted",
        isOpen && "border-r"
      )}
    >
      <div className="flex flex-col items-center">
        {topViews.map(({ id, title, icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <ActivityBarItem id={id} icon={icon} />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              {title}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        {bottomViews.map(({ id, title, icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <ActivityBarItem id={id} icon={icon} />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              {title}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
