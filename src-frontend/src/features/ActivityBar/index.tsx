import { BotMessageSquareIcon, CalendarClockIcon, FoldersIcon, LayoutListIcon, ScrollTextIcon, SettingsIcon, ToolCaseIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";
import { type SideBarView, useSidebarStore } from "@/stores/sidebar-store";

type ActivityBarView = {
  id: SideBarView;
  titleKey: string;
  icon: React.ReactNode;
};

const topViews: ActivityBarView[] = [
  {
    id: "tasks",
    titleKey: "activity_bar.tasks",
    icon: <LayoutListIcon />,
  },
  {
    id: "schedules",
    titleKey: "activity_bar.schedules",
    icon: <CalendarClockIcon />,
  },
  {
    id: "workspaces",
    titleKey: "activity_bar.workspaces",
    icon: <FoldersIcon />,
  },
  {
    id: "agents",
    titleKey: "activity_bar.agents",
    icon: <BotMessageSquareIcon />,
  },
  {
    id: "toolsets",
    titleKey: "activity_bar.toolsets",
    icon: <ToolCaseIcon />,
  },
  {
    id: "skills",
    titleKey: "activity_bar.skills",
    icon: <ScrollTextIcon />,
  },
  // {
  //   id: "plugins",
  //   titleKey: "activity_bar.plugins",
  //   icon: <BlocksIcon />,
  // },
];

const bottomViews: ActivityBarView[] = [
  {
    id: "settings",
    titleKey: "activity_bar.settings",
    icon: <SettingsIcon />,
  },
];

type ActivityBarItemProps = {
  id: SideBarView;
  icon: React.ReactNode;
} & React.ComponentProps<typeof Button>;

function ActivityBarItem({ id, icon, ...props }: ActivityBarItemProps) {
  const { activeView, isOpen, toggle: toggleSidebar } = useSidebarStore();

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
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const isOpen = useSidebarStore((state) => state.isOpen);
  return (
    <div className={cn("flex flex-col justify-between bg-layout-activity-bar", isOpen && "border-r")}>
      <div className="flex flex-col items-center">
        {topViews.map(({ id, titleKey, icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <ActivityBarItem id={id} icon={icon} />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              {t(titleKey)}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        {bottomViews.map(({ id, titleKey, icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <ActivityBarItem id={id} icon={icon} />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              {t(titleKey)}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
