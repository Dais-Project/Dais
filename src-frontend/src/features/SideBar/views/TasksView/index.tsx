import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { Activity, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FailedToLoad } from "@/components/FailedToLoad";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { TaskType } from "@/types/task";
import { SideBarHeader } from "../../SideBar";
import { TaskIcon } from "./TaskIcon";
import { TaskList } from "./TaskList";
import { TaskListSkeleton } from "./TaskListSkeleton";

export function TasksView() {
  const { addTab } = useTabsStore();
  const { currentWorkspace } = useWorkspaceStore();

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
      <SideBarHeader
        title="Tasks"
        actions={[
          {
            button: (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={!currentWorkspace}
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleNewTask("agent")}>
                    <TaskIcon taskType="agent" className="mr-2 size-4" />
                    Agent 模式
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleNewTask("orchestration")}
                  >
                    <TaskIcon
                      taskType="orchestration"
                      className="mr-2 size-4"
                    />
                    Orchestrator 模式
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
            tooltip: "Create new task",
          },
        ]}
      />
      <div className="h-full min-h-0 flex-1">
        <Activity mode={currentWorkspace ? "visible" : "hidden"}>
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
        </Activity>
        <Activity mode={currentWorkspace ? "hidden" : "visible"}>
          <Empty>
            <EmptyContent>
              <EmptyTitle>未选择工作区</EmptyTitle>
              <EmptyDescription>
                请先选择一个工作区以查看任务。
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        </Activity>
      </div>
    </div>
  );
}
TasksView.componentId = "tasks";
