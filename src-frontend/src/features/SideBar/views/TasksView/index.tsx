import { PlusIcon } from "lucide-react";
import type { TaskType } from "@/api/generated/schemas";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { DEFAULT_TAB_TITLE } from "@/features/Tabs/TaskPanel";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SideBarHeader, SideBarHeaderAction, SideBarHeaderDropdownAction, SideBarHeaderDropdownItem } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { TaskIcon } from "./TaskIcon";
import { TaskList } from "./TaskList";
import { Button } from "@/components/ui/button";

export function TasksView() {
  const addTab = useTabsStore((state) => state.add);
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  const handleNewTask = (taskType: TaskType) => {
    addTab({
      id: tabIdFactory(),
      title: DEFAULT_TAB_TITLE,
      type: "task",
      metadata: {
        isDraft: true,
        type: taskType,
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title="Tasks">
        <SideBarHeaderAction Icon={PlusIcon} tooltip="Create new task" onClick={() => handleNewTask("agent")} />
        {/* <SideBarHeaderDropdownAction Icon={PlusIcon} tooltip="Create new task">
          <SideBarHeaderDropdownItem onClick={() => handleNewTask("agent")}>
            <TaskIcon taskType="agent" className="mr-2 size-4" />
            Agent 模式
          </SideBarHeaderDropdownItem>
          <SideBarHeaderDropdownItem onClick={() => handleNewTask("orchestration")}>
            <TaskIcon taskType="orchestration" className="mr-2 size-4" />
            Orchestrator 模式
          </SideBarHeaderDropdownItem>
        </SideBarHeaderDropdownAction> */}
      </SideBarHeader>
      <div className="h-full min-h-0 flex-1">
        {currentWorkspace && (
          <AsyncBoundary skeleton={<SideBarListSkeleton />} errorDescription="无法加载任务列表，请稍后重试。">
            <TaskList workspaceId={currentWorkspace.id} />
          </AsyncBoundary>
        )}
        {!currentWorkspace && (
          <Empty>
            <EmptyContent>
              <EmptyTitle>未选择工作区</EmptyTitle>
              <EmptyDescription>请先选择一个工作区以查看任务。</EmptyDescription>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </div>
  );
}
TasksView.componentId = "tasks";
