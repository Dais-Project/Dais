import { useBoolean, useThrottleFn } from "ahooks";
import { Activity, use, useEffect } from "react";
import { type PanelSize, useDefaultLayout, useGroupRef, usePanelRef } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import { backendReady } from "@/api";
import { activityVisible } from "@/lib/activity-visible";
import { ActivityBar } from "./ActivityBar/ActivityBar";
import { SideBar } from "./SideBar/SideBar";
import { Tabs } from "./Tabs";
import { SessionViewSkeleton } from "./Tabs/TaskPanel/SessionView";
import { SideBarListSkeleton } from "./SideBar/components/SideBarListSkeleton";

function SideBarSkeleton() {
  return (
    <div className="h-full w-[320px] shrink-0 bg-muted/40 hidden sm:block">
      <div className="border-b p-3">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="space-y-1 p-2">
        <SideBarListSkeleton />
      </div>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-card">
      <div className="flex h-10 items-center gap-2 border-b bg-muted/40 px-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="flex-1 p-4">
        <SessionViewSkeleton />
      </div>
    </div>
  );
}

export function LayoutSkeleton() {
  return (
    <div className="flex h-full">
      {/* ActivityBarSkeleton */}
      <Skeleton className="w-12 h-full animate-none" />

      <div className="flex h-full min-w-0 flex-1">
        <SideBarSkeleton />
        <div className="w-px bg-border" />
        <TabsSkeleton />
      </div>
    </div>
  );
}

// --- --- --- --- --- ---

export function Layout() {
  use(backendReady);

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "panels",
    storage: localStorage,
  });
  const { isOpen, open: openSidebar, close: closeSidebar } = useSidebarStore();
  const [isResizing, { setTrue: resizeStart, setFalse: resizeEnd }] = useBoolean(false);
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
    { wait: 100 }
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
          className={cn("relative", { "resizable-panel-resizing": isResizing })}
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
