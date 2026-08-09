import { PanelLeftIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContainer,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Empty, EmptyContent, EmptyTitle } from "@/components/ui/empty";
import { SIDEBAR_NAMESPACE, TABS_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { TabPanelDispatcher } from "../../Tabs/components/TabPanels";
import { NavigationDrawer } from "./NavigationDrawer";

function TaskPanels() {
  const { t } = useTranslation(TABS_NAMESPACE);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const taskTabs = useMemo(() =>
    tabs
      .filter((tab) => tab.type === "task")
      .sort((a, b) => a.createdAt - b.createdAt),
    [tabs],
  );

  if (activeTabId === null || taskTabs.length === 0) {
    return (
      <Empty className="h-full rounded-none">
        <EmptyContent className="mb-16">
          <EmptyTitle>{t("tabs.empty.no_tabs_open")}</EmptyTitle>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-layout-tabs-content">
      {taskTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
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
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
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
      <Drawer
        direction="left"
        open={isNavigationOpen}
        onOpenChange={setIsNavigationOpen}
      >
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
            <TaskPanels />
          </main>
        </div>
        <NavigationDrawer onClose={() => setIsNavigationOpen(false)} />
      </Drawer>
    </DrawerContainer>
  );
}
