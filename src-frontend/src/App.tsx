import { useThrottleFn } from "ahooks";
import { useEffect, useRef } from "react";
import {
  type PanelSize,
  useDefaultLayout,
  useGroupRef,
  usePanelRef,
} from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { applyTheme } from "@/lib/applyTheme";
import { useConfigStore } from "@/stores/config-store";
import { TooltipProvider } from "./components/ui/tooltip";
import { ActivityBar } from "./features/ActivityBar/ActivityBar";
import { SideBar } from "./features/SideBar/SideBar";
import { Tabs } from "./features/Tabs";
import { useSidebarStore } from "./stores/sidebar-store";

function Layout() {
  const { defaultLayout, onLayoutChange } = useDefaultLayout({
    id: "panels",
    storage: localStorage,
  });

  const { isOpen, openSidebar, closeSidebar } = useSidebarStore();
  const recentPanelSizePx = useRef(0);
  const groupRef = useGroupRef();
  const sideBarPanelRef = usePanelRef();

  const { run: handleSideBarResize } = useThrottleFn(
    (panelSize: PanelSize, _: string | number | undefined) => {
      const isClosed = panelSize.asPercentage === 0;
      if (isClosed && isOpen) {
        closeSidebar();
      } else if (!(isClosed || isOpen)) {
        openSidebar();
        recentPanelSizePx.current = panelSize.inPixels;
      }
    },
    { wait: 100 }
  );

  useEffect(() => {
    if (groupRef.current === null || sideBarPanelRef.current === null) {
      return;
    }
    try {
      if (isOpen) {
        sideBarPanelRef.current.resize(recentPanelSizePx.current);
      } else {
        sideBarPanelRef.current.collapse();
      }
    } catch (e) {
      console.warn(e);
    }
  }, [isOpen]);

  return (
    <div className="flex h-full">
      <ActivityBar />
      <ResizablePanelGroup
        className="h-full"
        orientation="horizontal"
        groupRef={groupRef}
        onLayoutChange={onLayoutChange}
        defaultLayout={defaultLayout}
      >
        <ResizablePanel
          panelRef={sideBarPanelRef}
          minSize={300}
          maxSize={"60%"}
          collapsible
          onResize={handleSideBarResize}
        >
          <SideBar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize={300}>
          <Tabs />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function App() {
  const { config } = useConfigStore();
  const { theme } = config;

  useEffect(() => applyTheme(theme), [theme]);

  return (
    <TooltipProvider>
      <Layout />
    </TooltipProvider>
  );
}

export default App;
