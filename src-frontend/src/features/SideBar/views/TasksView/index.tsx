import { PlusIcon } from "lucide-react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { DEFAULT_TAB_TITLE } from "@/features/Tabs/TaskPanel";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { TaskList } from "./TaskList";

function openTaskCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    id: tabIdFactory(),
    title: DEFAULT_TAB_TITLE,
    type: "task",
    metadata: {
      isDraft: true,
    },
  });
}

export function TasksView() {
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  const Content = () => {
    if (!currentWorkspace) {
      return (
        <Empty>
          <EmptyContent>
            <EmptyTitle>未选择工作区</EmptyTitle>
            <EmptyDescription>请先选择一个工作区以查看任务。</EmptyDescription>
          </EmptyContent>
        </Empty>
      );
    }

    return (
      <AsyncBoundary skeleton={<SideBarListSkeleton />} errorDescription="无法加载任务列表，请稍后重试。">
        <TaskList workspaceId={currentWorkspace.id} />
      </AsyncBoundary>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title="Tasks">
        <SideBarHeaderAction Icon={PlusIcon} tooltip="Create new task" onClick={openTaskCreateTab} />
      </SideBarHeader>
      <div className="h-full min-h-0 flex-1">
        <Content />
      </div>
    </div>
  );
}
TasksView.componentId = "tasks";
