import { TABS_NAMESPACE } from "@/i18n/resources";
import { activityVisible } from "@/lib/activity-visible";
import { StoredTab, useTabsStore } from "@/stores/tabs-store";
import { Activity, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AgentPanel } from "../AgentPanel";
import { ProviderPanel } from "../ProviderPanel";
import { SchedulePanel } from "../SchedulePanel";
import { SkillPanel } from "../SkillPanel";
import { TaskPanel } from "../TaskPanel";
import { ToolsetPanel } from "../ToolsetPanel";
import { WorkspacePanel } from "../WorkspacePanel";

function TabPanelDispatcher({
  tab,
  isActive,
}: {
  tab: StoredTab;
  isActive: boolean;
}) {
  switch (tab.type) {
    case "task":
      return <TaskPanel {...tab} isActive={isActive} />;
    case "workspace":
      return (
        <Activity mode={activityVisible(isActive)}>
          <WorkspacePanel isActive={isActive} {...tab} />
        </Activity>
      );
    case "agent":
      return (
        <Activity mode={activityVisible(isActive)}>
          <AgentPanel isActive={isActive} {...tab} />
        </Activity>
      );
    case "provider":
      return (
        <Activity mode={activityVisible(isActive)}>
          <ProviderPanel isActive={isActive} {...tab} />
        </Activity>
      );
    case "toolset":
      return (
        <Activity mode={activityVisible(isActive)}>
          <ToolsetPanel isActive={isActive} {...tab} />
        </Activity>
      );
    case "skill":
      return (
        <Activity mode={activityVisible(isActive)}>
          <SkillPanel isActive={isActive} {...tab} />
        </Activity>
      );
    case "schedule":
      return (
        <Activity mode={activityVisible(isActive)}>
          <SchedulePanel isActive={isActive} {...tab} />
        </Activity>
      );
    default:
      return null;
  }
}

export function TabPanels() {
  const { t } = useTranslation(TABS_NAMESPACE);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const sortedTabs = useMemo(() => [...tabs].sort((a, b) => a.createdAt - b.createdAt), [tabs]);

  if (activeTabId === null || sortedTabs.length === 0) {
    return (
      <div className="flex flex-1 h-full items-center justify-center">
        <p className="mb-16">{t("tabs.empty.no_tabs_open")}</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-hidden bg-layout-tabs-content">
      {sortedTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            role="tabpanel"
            key={tab.id}
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className="h-full"
            style={{ display: isActive ? "block" : "none" }}
          >
            <TabPanelDispatcher tab={tab} isActive={isActive} />
          </div>
        );
      })}
    </div>
  );
}
