import { XIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyTitle } from "@/components/ui/empty";
import { ItemTitle } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TabIcon } from "@/features/Tabs/components/TabIcon";
import { TabIndicator } from "@/features/Tabs/components/TabIndicator";
import { TABS_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { useNavigationDrawer } from "../NavigationDrawerContext";
import { NavigationListItem } from "../components/NavigationListItem";

export function OpenedTasks() {
  const { t } = useTranslation(TABS_NAMESPACE);
  const { close: closeDrawer } = useNavigationDrawer();
  const tabs = useTabsStore((state) => state.tabs);
  const indicators = useTabsStore((state) => state.indicators);
  const setActiveTab = useTabsStore((state) => state.setActive);
  const removeTab = useTabsStore((state) => state.remove);
  const taskTabs = useMemo(
    () =>
      tabs
        .filter((tab) => tab.type === "task")
        .sort((a, b) => a.createdAt - b.createdAt),
    [tabs],
  );

  if (taskTabs.length === 0) {
    return (
      <Empty className="h-full rounded-none">
        <EmptyContent>
          <EmptyTitle>{t("tabs.empty.no_tabs_open")}</EmptyTitle>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ScrollArea className="h-full">
      {taskTabs.map((tab) => {
        const indicator = indicators[tab.id] ?? null;
        return (
          <NavigationListItem
            key={tab.id}
            id={`mobile-tab-${tab.id}`}
            triggerClassName="py-2"
            icon={
              <span className="relative">
                <TabIcon tab={tab} className="size-5" />
                {indicator !== null && (
                  <TabIndicator indicator={indicator} />
                )}
              </span>
            }
            onClick={() => {
              setActiveTab(tab.id);
              closeDrawer();
            }}
            actions={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close tab"
                onClick={() => removeTab(tab.id)}
              >
                <XIcon className="size-4" />
              </Button>
            }
          >
            <ItemTitle className="min-w-0 flex-1">
              <span className="truncate">{tab.title}</span>
            </ItemTitle>
          </NavigationListItem>
        );
      })}
    </ScrollArea>
  );
}
