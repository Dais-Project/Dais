import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { usePrevious } from "ahooks";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FailedToLoad } from "@/components/FailedToLoad";
import type { TaskTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { CreateView } from "./CreateView";
import { SessionView } from "./SessionView";
import { SessionViewSkeleton } from "./SessionViewSkeleton";
import { AgentTaskProvider } from "./use-agent-task";

export const DEFAULT_TAB_TITLE = "New task";

export function TaskPanel({ tabId, metadata }: TabPanelProps<TaskTabMetadata>) {
  const previousIsDraft = usePrevious(metadata.isDraft);
  const [shouldStartStream, setShouldStartStream] = useState(false);

  useEffect(() => {
    if (previousIsDraft === true && metadata.isDraft === false) {
      setShouldStartStream(true);
    }
  }, [previousIsDraft, metadata.isDraft]);

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
              <SessionView shouldStartStream={shouldStartStream} />
            </AgentTaskProvider>
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
