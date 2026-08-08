import { useEffect, useMemo } from "react";
import { PanelLeftIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContainer,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SIDEBAR_NAMESPACE, TABS_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { TabPanelDispatcher } from "../../Tabs/components/TabPanels";
import { MobileNavigationDrawer } from "./NavigationDrawer";

function MobileTaskPanels() {
  const { t } = useTranslation(TABS_NAMESPACE);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const taskTabs = useMemo(
    () =>
      tabs
        .filter((tab) => tab.type === "task")
        .sort((a, b) => a.createdAt - b.createdAt),
    [tabs],
  );

  const effectiveActiveTabId = taskTabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : (taskTabs[0]?.id ?? null);

  if (taskTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center">
        <p className="mb-16">{t("tabs.empty.no_tabs_open")}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-layout-tabs-content">
      {taskTabs.map((tab) => {
        const isActive = tab.id === effectiveActiveTabId;
        return (
          <div
            role="tabpanel"
            key={tab.id}
            id={`panel-${tab.id}`}
            aria-labelledby={`mobile-tab-${tab.id}`}
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

export function Layout() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTab = useTabsStore((state) => state.setActive);
  const taskTabs = useMemo(
    () =>
      tabs
        .filter((tab) => tab.type === "task")
        .sort((a, b) => a.createdAt - b.createdAt),
    [tabs],
  );
  const activeTaskTab =
    taskTabs.find((tab) => tab.id === activeTabId) ?? taskTabs[0] ?? null;

  useEffect(() => {
    if (activeTaskTab !== null && activeTaskTab.id !== activeTabId) {
      setActiveTab(activeTaskTab.id);
    }
  }, [activeTabId, activeTaskTab, setActiveTab]);

  return (
    <DrawerContainer className="h-dvh min-h-dvh overflow-hidden bg-layout-tabs-content">
      <Drawer direction="left">
        <div className="flex h-full flex-col">
          <header className="flex min-h-12 shrink-0 items-center gap-2 border-b bg-layout-tabs-bar px-2 pt-[env(safe-area-inset-top)]">
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-10"
                aria-label={t("mobile.open_navigation")}
              >
                <PanelLeftIcon />
              </Button>
            </DrawerTrigger>
            <h1 className="min-w-0 flex-1 truncate font-medium text-sm">
              {activeTaskTab?.title ?? ""}
            </h1>
          </header>
          <main className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
            <MobileTaskPanels />
          </main>
        </div>
        <MobileNavigationDrawer />
      </Drawer>
    </DrawerContainer>
  );
}
