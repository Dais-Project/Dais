import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { TaskType } from "@/api/generated/schemas";
import { FailedToLoad } from "@/components/custom/FailedToLoad";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { DEFAULT_TAB_TITLE } from "@/features/Tabs/TaskPanel";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  SideBarHeader,
  SideBarHeaderDropdownAction,
  SideBarHeaderDropdownItem,
} from "../../components/SideBarHeader";
import { TaskIcon } from "./TaskIcon";
import { TaskList } from "./TaskList";
import { TaskListSkeleton } from "./TaskListSkeleton";

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
        <SideBarHeaderDropdownAction Icon={PlusIcon} tooltip="Create new task">
          <SideBarHeaderDropdownItem onClick={() => handleNewTask("agent")}>
            <TaskIcon taskType="agent" className="mr-2 size-4" />
            Agent 模式
          </SideBarHeaderDropdownItem>
          <SideBarHeaderDropdownItem
            onClick={() => handleNewTask("orchestration")}
          >
            <TaskIcon taskType="orchestration" className="mr-2 size-4" />
            Orchestrator 模式
          </SideBarHeaderDropdownItem>
        </SideBarHeaderDropdownAction>
      </SideBarHeader>
      <div className="h-full min-h-0 flex-1">
        {currentWorkspace && (
          <QueryErrorResetBoundary>
            {({ reset }) => {
              if (!currentWorkspace) {
                return null;
              }
              return (
                <ErrorBoundary
                  onReset={reset}
                  fallbackRender={({ resetErrorBoundary }) => (
                    <FailedToLoad
                      refetch={resetErrorBoundary}
                      description="无法加载任务列表，请稍后重试。"
                    />
                  )}
                >
                  <Suspense fallback={<TaskListSkeleton />}>
                    <TaskList workspaceId={currentWorkspace.id} />
                  </Suspense>
                </ErrorBoundary>
              );
            }}
          </QueryErrorResetBoundary>
        )}
        {!currentWorkspace && (
          <Empty>
            <EmptyContent>
              <EmptyTitle>未选择工作区</EmptyTitle>
              <EmptyDescription>
                请先选择一个工作区以查看任务。
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </div>
  );
}
TasksView.componentId = "tasks";
