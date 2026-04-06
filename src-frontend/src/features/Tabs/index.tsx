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
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { StoredTab, useTabsStore } from "@/stores/tabs-store";
import { TabBar } from "./components/TabBar";
import { TabPanels } from "./components/TabPanels";

export type TabPanelProps<Metadata> = Omit<StoredTab, "metadata"> & {
  isActive: boolean;
  metadata: Metadata;
};

export function Tabs() {
  const tabs = useTabsStore((state) => state.tabs);
  const updateTabs = useTabsStore((state) => state.update);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
      const newIndex = tabs.findIndex((tab) => tab.id === over.id);
      updateTabs((draft) => arrayMove(draft, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <div className="flex h-full flex-col">
        <TabBar />
        <TabPanels />
      </div>
    </DndContext>
  );
}
