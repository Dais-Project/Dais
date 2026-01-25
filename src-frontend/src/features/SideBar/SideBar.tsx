import { Activity } from "react";
import { activityVisible } from "@/lib/activity-visible";
import { useSidebarStore } from "@/stores/sidebar-store";
import { AgentsView } from "./views/AgentsView";
import { PluginsView } from "./views/PluginsView";
import { SettingsView } from "./views/SettingsView";
import { TasksView } from "./views/TasksView";
import { ToolsetsView } from "./views/ToolsetsView";
import { WorkspacesView } from "./views/WorkspacesView";

export function SideBar() {
  const activeView = useSidebarStore((state) => state.activeView);

  if (!activeView) {
    return null;
  }

  return (
    <div className="h-full bg-muted/40">
      {[
        TasksView,
        WorkspacesView,
        AgentsView,
        ToolsetsView,
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
