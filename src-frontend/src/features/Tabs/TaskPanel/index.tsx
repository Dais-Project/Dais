import { useRef } from "react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import type { TaskTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { CreateView } from "./CreateView";
import { AgentTaskProvider } from "./hooks/use-agent-task";
import { SessionView, SessionViewSkeleton } from "./SessionView";

export const DEFAULT_TAB_TITLE = "New task";

export function TaskPanel({ tabId, metadata }: TabPanelProps<TaskTabMetadata>) {
  const isInitialDraft = useRef(metadata.isDraft);

  if (metadata.isDraft) {
    return <CreateView tabId={tabId} taskType={metadata.type} />;
  }

  return (
    <AsyncBoundary
      skeleton={<SessionViewSkeleton />}
      errorDescription="无法加载任务，请稍后重试。"
    >
      <AgentTaskProvider taskId={metadata.id}>
        <SessionView shouldStartStream={isInitialDraft.current} />
      </AgentTaskProvider>
    </AsyncBoundary>
  );
}
