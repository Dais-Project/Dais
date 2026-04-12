import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BotIcon, FolderCogIcon, type LucideIcon, PlugIcon, ScrollTextIcon, ToolCaseIcon, XIcon } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import { cn } from "@/lib/utils";
import { Tab } from "@/types/tab";
import { StoredTab, useTabsStore } from "@/stores/tabs-store";

const TAB_ICON_MAP: Record<Tab["type"], LucideIcon> = {
  task: BotIcon,
  workspace: FolderCogIcon,
  agent: BotIcon,
  provider: PlugIcon,
  toolset: ToolCaseIcon,
  skill: ScrollTextIcon,
};

function SortableTab({ tab }: { tab: StoredTab }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const removeTab = useTabsStore((state) => state.remove);
  const setActiveTab = useTabsStore((state) => state.setActive);

  const style = { transform: CSS.Translate.toString(transform), transition };

  const handleTabClose = (e: React.MouseEvent<SVGSVGElement>, tabId: string) => {
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
    const TargetIcon = TAB_ICON_MAP[tab.type];
    return <TargetIcon size="1em" />;
  })();
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex", { "z-10 border-l": isDragging })}
      {...attributes}
      {...listeners}
    >
      <div
        role="tab"
        id={`tab-${tab.id}`}
        aria-selected={tab.id === activeTabId}
        aria-controls={`panel-${tab.id}`}
        tabIndex={tab.id === activeTabId ? 0 : -1}
        onMouseDown={(e) => handleMouseDown(e, tab.id)}
        className={cn(
          "group flex min-w-24 shrink-0 cursor-pointer items-center justify-between gap-2 text-nowrap border-r border-b p-2.25 pl-3 text-muted-foreground text-sm outline-0 transition-colors duration-200 ease-in-out",
          "hover:text-primary",
          { "border-b-transparent bg-layout-tabs-content! text-primary!": tab.id === activeTabId }
        )}
      >
        <div className="text-base">{tabIcon}</div>
        <span>{tab.title}</span>
        <XIcon
          size="1em"
          className={cn("rounded-sm opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100", {
            "opacity-100": tab.id === activeTabId,
          })}
          onClick={(e) => handleTabClose(e, tab.id)}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

export function TabBar() {
  const scrollAreaRef = useHorizontalScroll<HTMLDivElement>();
  const tabs = useTabsStore((state) => state.tabs);
  const setActiveTab = useTabsStore((state) => state.setActive);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const removeTab = useTabsStore((state) => state.remove);

  const focusTab = (id: string) => {
    setActiveTab(id);
    requestAnimationFrame(() => {
      document.getElementById(`tab-${id}`)?.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusTab(tabs[(currentIndex + 1) % tabs.length].id);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id);
        break;
      case "Home":
        e.preventDefault();
        focusTab(tabs[0].id);
        break;
      case "End":
        e.preventDefault();
        focusTab(tabs[tabs.length - 1].id);
        break;
      case "Delete":
        e.preventDefault();
        if (activeTabId) removeTab(activeTabId);
        break;
    }
  };

  return (
    <ScrollArea ref={scrollAreaRef}>
      <SortableContext items={tabs.map((tab) => tab.id)} strategy={horizontalListSortingStrategy}>
        <div
          role="tablist"
          aria-label="Tabs"
          onKeyDown={handleKeyDown}
          className="flex shrink-0 bg-layout-tabs-bar"
        >
          {tabs.map((tab) => <SortableTab key={tab.id} tab={tab} />)}
          <div className="flex-1 border-b" />
        </div>
      </SortableContext>
      <ScrollBar className="h-1.5" orientation="horizontal" />
    </ScrollArea>
  );
}