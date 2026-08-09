import {
  BotIcon,
  CalendarPlusIcon,
  FolderCogIcon,
  type LucideIcon,
  PlugIcon,
  ScrollTextIcon,
  ToolCaseIcon,
} from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import type { StoredTab } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";

const TAB_ICON_MAP: Record<Tab["type"], LucideIcon> = {
  task: BotIcon,
  schedule: CalendarPlusIcon,
  workspace: FolderCogIcon,
  agent: BotIcon,
  provider: PlugIcon,
  toolset: ToolCaseIcon,
  skill: ScrollTextIcon,
};

type TabIconProps = {
  tab: Pick<StoredTab, "icon" | "type">;
  className?: string;
  size?: string | number;
};

export function TabIcon({ tab, className, size }: TabIconProps) {
  if (tab.icon) {
    return <DynamicIcon name={tab.icon} className={className} size={size} />;
  }

  const TargetIcon = TAB_ICON_MAP[tab.type];
  return <TargetIcon className={className} size={size} />;
}
