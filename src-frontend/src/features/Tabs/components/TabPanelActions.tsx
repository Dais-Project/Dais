import { createContext, useContext, useMemo } from "react";
import { useTabsStore } from "@/stores/tabs-store";

type TabPanelActions = {
  activate: () => void;
  close: () => void;
};

const TabPanelActionsContext = createContext<TabPanelActions | null>(null);

type TabPanelActionsProviderProps = {
  tabId: string;
  children: React.ReactNode;
};

export function TabPanelActionsProvider({
  tabId,
  children,
}: TabPanelActionsProviderProps) {
  const setActiveTab = useTabsStore((state) => state.setActive);
  const removeTab = useTabsStore((state) => state.remove);

  const value = useMemo(
    () => ({
      activate: () => setActiveTab(tabId),
      close: () => removeTab(tabId),
    }),
    [tabId, setActiveTab, removeTab],
  );

  return (
    <TabPanelActionsContext value={value}>
      {children}
    </TabPanelActionsContext>
  );
}

export function useTabPanelActions() {
  const context = useContext(TabPanelActionsContext);
  if (!context) {
    throw new Error(
      "useTabPanelActions must be used within TabPanelActionsProvider",
    );
  }
  return context;
}
