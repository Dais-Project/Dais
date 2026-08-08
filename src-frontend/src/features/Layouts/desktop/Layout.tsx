import { useBoolean, useDebounceFn, useThrottleFn } from "ahooks";
import { Activity, useEffect } from "react";
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
import { useSidebarStore } from "@/stores/sidebar-store";
import { activityVisible } from "@/lib/activity-visible";
import { ActivityBar } from "../../ActivityBar";
import { SideBar } from "../../SideBar";
import { Tabs } from "../../Tabs";

export function Layout() {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "panels",
    storage: localStorage,
  });
  const { isOpen, open: openSidebar, close: closeSidebar } = useSidebarStore();
  const [isResizing, { setTrue: resizeStart, setFalse: resizeEnd }] =
    useBoolean(false);
  const groupRef = useGroupRef();
  const sideBarPanelRef = usePanelRef();

  const { run: handleSideBarResize } = useThrottleFn(
    (panelSize: PanelSize, _: string | number | undefined) => {
      const isClosed = panelSize.asPercentage === 0;
      if (isClosed && isOpen) {
        closeSidebar();
      } else if (!(isClosed || isOpen)) {
        openSidebar();
      }
    },
    { wait: 100 },
  );

  const { run: handleTabsResize } = useDebounceFn(
    // use an extra resized handler to ensure the isResizing state is reset
    (_panelSize: PanelSize, _: string | number | undefined) => {
      resizeEnd();
    },
    { wait: 300 },
  );

  useEffect(() => {
    if (groupRef.current === null || sideBarPanelRef.current === null) {
      return;
    }

    const isCollapsed = sideBarPanelRef.current.isCollapsed();
    try {
      if (isOpen && isCollapsed) {
        sideBarPanelRef.current.expand();
      } else if (!(isOpen || isCollapsed)) {
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
        onLayoutChange={resizeStart}
        onLayoutChanged={(layout) => {
          resizeEnd();
          onLayoutChanged(layout);
        }}
        defaultLayout={defaultLayout}
        data-is-resizing={isResizing || undefined}
        data-resizable-group
      >
        <ResizablePanel
          id="sidebar"
          collapsible
          minSize={300}
          maxSize={"60%"}
          panelRef={sideBarPanelRef}
          onResize={handleSideBarResize}
        >
          <SideBar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          id="tabs"
          minSize={300}
          className="relative"
          onResize={handleTabsResize}
        >
          <Activity mode={activityVisible(isResizing)}>
            <div className="absolute inset-0 z-50 select-none" />
          </Activity>
          <Tabs />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
