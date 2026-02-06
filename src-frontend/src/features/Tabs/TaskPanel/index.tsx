import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FailedToLoad } from "@/components/FailedToLoad";
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
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <FailedToLoad
              refetch={resetErrorBoundary}
              description="无法加载任务，请稍后重试。"
            />
          )}
        >
          <Suspense fallback={<SessionViewSkeleton />}>
            <AgentTaskProvider taskId={metadata.id}>
              <SessionView shouldStartStream={isInitialDraft.current} />
            </AgentTaskProvider>
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
