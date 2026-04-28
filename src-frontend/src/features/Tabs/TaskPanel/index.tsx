import { Activity, useRef } from "react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { activityVisible } from "@/lib/activity-visible";
import type { TaskTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TaskDraftView } from "./views/TaskDraftView";
import { AgentTaskProvider } from "./hooks/use-agent-task";
import { TaskSessionView, TaskSessionViewSkeleton } from "./views/TaskSessionView";
import { TaskTabIndicator } from "./components/TaskTabIndicator";

export function TaskPanel({ id, isActive, metadata }: TabPanelProps<TaskTabMetadata>) {
  const isInitialDraft = useRef(metadata.type === "task" && metadata.isDraft);

  switch (metadata.type) {
    case "task":
      if (metadata.isDraft) {
        return <TaskDraftView tabId={id} workspaceId={metadata.workspace_id} />;
      }
      return (
        <AsyncBoundary skeleton={<TaskSessionViewSkeleton />}>
          <AgentTaskProvider taskId={metadata.id} taskType={metadata.type}>
            <TaskTabIndicator tabId={id} isActive={isActive} />
            <Activity mode={activityVisible(isActive)}>
              <TaskSessionView
                workspaceId={metadata.workspace_id}
                shouldStartStream={(() => {
                  const value = isInitialDraft.current;
                  isInitialDraft.current = false;
                  return value;
                })()}
              />
            </Activity>
          </AgentTaskProvider>
        </AsyncBoundary>
      );
    case "schedule":
      // TODO: implement this
      return null;
  }
}
