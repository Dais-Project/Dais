import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { i18n } from "@/i18n";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import type { TaskTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { CreateView } from "./CreateView";
import { AgentTaskProvider } from "./hooks/use-agent-task";
import { SessionView, SessionViewSkeleton } from "./SessionView";

export const DEFAULT_TAB_TITLE = i18n.t("tab.default_title", { ns: TABS_TASK_NAMESPACE });

export function TaskPanel({ tabId, metadata }: TabPanelProps<TaskTabMetadata>) {
  const { t } = useTranslation("tabs-task");
  const isInitialDraft = useRef(metadata.isDraft);

  if (metadata.isDraft) {
    return <CreateView tabId={tabId} />;
  }

  return (
    <AsyncBoundary
      skeleton={<SessionViewSkeleton />}
      errorDescription={t("panel.error.load_description")}
    >
      <AgentTaskProvider taskId={metadata.id}>
        <SessionView shouldStartStream={isInitialDraft.current} />
      </AgentTaskProvider>
    </AsyncBoundary>
  );
}
