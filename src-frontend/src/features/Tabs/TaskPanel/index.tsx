import { useRef } from "react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { i18n } from "@/i18n";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { TaskTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { CreateView } from "./CreateView";
import { AgentTaskProvider } from "./hooks/use-agent-task";
import { SessionView, SessionViewSkeleton } from "./SessionView";

export const DEFAULT_TAB_TITLE = i18n.t("tab.default_title", { ns: TABS_TASK_NAMESPACE });

export function TaskPanel({ id, isClosing, metadata }: TabPanelProps<TaskTabMetadata>) {
  const isInitialDraft = useRef(metadata.isDraft);

  if (metadata.isDraft) {
    return <CreateView tabId={id} workspaceId={metadata.workspace_id} />;
  }

  return (
    <AsyncBoundary skeleton={<SessionViewSkeleton />}>
      <AgentTaskProvider taskId={metadata.id}>
        <SessionView
          isUnmounted={isClosing}
          workspaceId={metadata.workspace_id}
          shouldStartStream={(() => {
            const value = isInitialDraft.current;
            isInitialDraft.current = false;
            return value;
          })()}
        />
      </AgentTaskProvider>
    </AsyncBoundary>
  );
}
