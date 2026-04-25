import { Activity } from "react";
import { activityVisible } from "@/lib/activity-visible";
import { useSidebarStore } from "@/stores/sidebar-store";
import { TasksView } from "./views/TasksView";
import { SchedulesView } from "./views/SchedulesView";
import { AgentsView } from "./views/AgentsView";
import { WorkspacesView } from "./views/WorkspacesView";
import { ToolsetsView } from "./views/ToolsetsView";
import { SkillsView } from "./views/SkillsView";
import { PluginsView } from "./views/PluginsView";
import { SettingsView } from "./views/SettingsView";

export function SideBar() {
  const activeView = useSidebarStore((state) => state.activeView);

  if (!activeView) {
    return null;
  }

  return (
    <div className="h-full bg-layout-sidebar">
      {[
        TasksView,
        SchedulesView,
        WorkspacesView,
        AgentsView,
        ToolsetsView,
        SkillsView,
        PluginsView,
        SettingsView,
      ].map((Component) => (
        <Activity
          key={Component.componentId}
          mode={activityVisible(activeView === Component.componentId)}
        >
          <Component />
        </Activity>
      ))}
    </div>
  );
}
