import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BotIcon,
  FolderCogIcon,
  type LucideIcon,
  PlugIcon,
  ToolCaseIcon,
  XIcon,
} from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { useEffect, useRef } from "react";
import {
  Tab as ReactTab,
  TabList as ReactTabList,
  TabPanel as ReactTabPanel,
  Tabs as ReactTabs,
} from "react-tabs";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTabsStore } from "@/stores/tabs-store";
import type {
  AgentTabMetadata,
  ProviderTabMetadata,
  Tab,
  TaskTabMetadata,
  ToolsetTabMetadata,
  WorkspaceTabMetadata,
} from "@/types/tab";
import { AgentPanel } from "./AgentPanel";
import { ProviderPanel } from "./ProviderPanel";
import { TaskPanel } from "./TaskPanel";
import { ToolsetPanel } from "./ToolsetPanel";
import { WorkspacePanel } from "./WorkspacePanel";

const tabIconMap: Record<Tab["type"], LucideIcon> = {
  task: BotIcon,
  workspace: FolderCogIcon,
  agent: BotIcon,
  provider: PlugIcon,
  toolset: ToolCaseIcon,
};

export type TabPanelProps<Metadata> = {
  tabId: string;
  metadata: Metadata;
};

function SortableTab({ tab, ...props }: { tab: Tab; props: unknown }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const removeTab = useTabsStore((state) => state.remove);
  const setActiveTab = useTabsStore((state) => state.setActive);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handleTabClose = (
    e: React.MouseEvent<SVGSVGElement>,
    tabId: string
  ) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>, tabId: string) => {
    if (e.button === 1) {
      removeTab(tabId);
    } else {
      setActiveTab(tabId);
    }
  };

  const tabIcon = (() => {
    if (tab.icon) {
      return <DynamicIcon name={tab.icon} size="1em" />;
    }
    const TargetIcon = tabIconMap[tab.type];
    return <TargetIcon size="1em" />;
  })();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex", {
        "z-10 border-l": isDragging,
      })}
      {...attributes}
      {...listeners}
    >
      <ReactTab
        {...props}
        key={tab.id}
        onMouseDown={(e) => handleMouseDown(e, tab.id)}
        className={cn(
          "group flex min-w-24 shrink-0 cursor-pointer items-center justify-between gap-2 text-nowrap border-r border-b p-2 pl-3 text-muted-foreground text-sm outline-0 transition-colors duration-200 ease-in-out",
          "hover:bg-card/60 hover:text-primary",
          {
            "border-b-transparent bg-card! text-primary!":
              tab.id === activeTabId,
          }
        )}
      >
        <div className="text-base">{tabIcon}</div>
        <span>{tab.title}</span>
        <XIcon
          size="1em"
          className={cn(
            "rounded-sm opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100",
            { "opacity-100": tab.id === activeTabId }
          )}
          onClick={(e) => handleTabClose(e, tab.id)}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </ReactTab>
    </div>
  );
}
SortableTab.tabsRole = "Tab";

function TabPanelRenderer({ tab }: { tab: Tab }) {
  switch (tab.type) {
    case "task":
      return (
        <TaskPanel tabId={tab.id} metadata={tab.metadata as TaskTabMetadata} />
      );
    case "workspace":
      return (
        <WorkspacePanel
          tabId={tab.id}
          metadata={tab.metadata as WorkspaceTabMetadata}
        />
      );
    case "agent":
      return (
        <AgentPanel
          tabId={tab.id}
          metadata={tab.metadata as AgentTabMetadata}
        />
      );
    case "provider":
      return (
        <ProviderPanel
          tabId={tab.id}
          metadata={tab.metadata as ProviderTabMetadata}
        />
      );
    case "toolset":
      return (
        <ToolsetPanel
          tabId={tab.id}
          metadata={tab.metadata as ToolsetTabMetadata}
        />
      );
    default:
      return null;
  }
}

export function Tabs() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTab = useTabsStore((state) => state.setActive);
  const replaceTabs = useTabsStore((state) => state.replace);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }

    const viewport = scrollArea.querySelector(
      "div[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    if (!viewport) {
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) {
        return;
      }
      e.preventDefault();
      viewport.scrollLeft += e.deltaY;
    };

    viewport.addEventListener("wheel", handleWheel);
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [tabs]);

  const handleTabSelect = (index: number) => {
    if (tabs[index]) {
      setActiveTab(tabs[index].id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
      const newIndex = tabs.findIndex((tab) => tab.id === over.id);
      const newTabs = arrayMove(tabs, oldIndex, newIndex);
      replaceTabs(newTabs);
    }
  };

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <ReactTabs
        selectedIndex={activeIndex}
        onSelect={handleTabSelect}
        forceRenderTabPanel={true}
        className="flex h-full flex-col"
        selectedTabPanelClassName="!block"
      >
        <ScrollArea ref={scrollAreaRef}>
          <SortableContext
            items={tabs.map((tab) => tab.id)}
            strategy={horizontalListSortingStrategy}
          >
            <ReactTabList className="shink-0 flex bg-muted/40 dark:bg-muted/75">
              {tabs.map((tab) => (
                // @ts-expect-error
                // The props defined in the SortableTab will be passed automatically
                // by the react-tabs library
                <SortableTab key={tab.id} tab={tab} />
              ))}
              <div className="flex-1 border-b" />
            </ReactTabList>
          </SortableContext>
          <ScrollBar className="h-1.5" orientation="horizontal" />
        </ScrollArea>

        <div className="grow overflow-hidden">
          {(() => {
            if (activeTabId === null) {
              return null;
            }
            if (tabs.length === 0) {
              return (
                <div className="flex h-full items-center justify-center bg-card">
                  <p>No tabs open</p>
                </div>
              );
            }
            return tabs.map((tab) => (
              <ReactTabPanel key={tab.id} className="hidden h-full bg-card">
                <TabPanelRenderer tab={tab} />
              </ReactTabPanel>
            ));
          })()}
        </div>
      </ReactTabs>
    </DndContext>
  );
}
