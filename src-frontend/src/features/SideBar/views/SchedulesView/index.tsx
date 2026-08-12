import { HistoryIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ExpandableSearchBar } from "@/components/custom/form/ExtendableSearchInput";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { SideBarSearchProvider } from "../../components/SideBarSearchContext";
import { RunningScheduleTaskList } from "./RunningScheduleTaskList";
import { ScheduleList } from "./ScheduleList";
import { SideBarSplitView, SideBarCollapsibleSection, SideBarPrimarySection } from "../../components/SideBarSplitView";

function openScheduleCreateTab() {
  const currentWorkspace = useWorkspaceStore.getState().current;
  if (!currentWorkspace) {
    return;
  }

  const addTab = useTabsStore.getState().add;
  addTab({
    type: "schedule",
    title: i18n.t("schedules.tab.create_title", { ns: SIDEBAR_NAMESPACE }),
    metadata: { mode: "create" },
  });
}

function openScheduleAllRecordsTab() {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) => tab.type === "schedule" && tab.metadata.mode === "all-records",
  );
  if (existingTab) {
    setActiveTab(existingTab.id);
    return;
  }

  addTab({
    type: "schedule",
    title: i18n.t("schedules.tab.all_records_title", { ns: SIDEBAR_NAMESPACE }),
    icon: "history",
    metadata: { mode: "all-records" },
  });
}

function CurrentWorkspaceSchedules({
  workspaceId,
  searchQuery,
  className,
}: {
  workspaceId?: number;
  searchQuery: string | null;
  className?: string;
}) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  if (!workspaceId) {
    return (
      <Empty className={className}>
        <EmptyContent>
          <EmptyTitle>{t("schedules.empty.no_workspace.title")}</EmptyTitle>
          <EmptyDescription>{t("schedules.empty.no_workspace.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <ScheduleList workspaceId={workspaceId} searchQuery={searchQuery} />
      </AsyncBoundary>
    </div>
  );
}

function RunningScheduleTasks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <RunningScheduleTaskList />
      </AsyncBoundary>
    </div>
  );
}

export function SchedulesView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  return (
    <SideBarSearchProvider>
      {({ normalizedQuery, setQuery }) => (
        <div className="flex h-full flex-col">
          <SideBarHeader title={t("schedules.header.title")} actionsClass="flex-1 ml-4">
            <ExpandableSearchBar
              className="flex-1"
              expandDirection="left"
              placeholder={t("schedules.header.search_placeholder")}
              onValueChange={setQuery}
            />
            <SideBarHeaderAction
              Icon={HistoryIcon}
              tooltip={t("schedules.header.history_tooltip")}
              onClick={openScheduleAllRecordsTab}
            />
            <SideBarHeaderAction
              Icon={PlusIcon}
              tooltip={t("schedules.header.create_tooltip")}
              onClick={openScheduleCreateTab}
              disabled={!currentWorkspace}
            />
          </SideBarHeader>

          <SideBarSplitView>
            <SideBarPrimarySection>
              <CurrentWorkspaceSchedules
                className="h-full"
                workspaceId={currentWorkspace?.id}
                searchQuery={normalizedQuery}
              />
            </SideBarPrimarySection>
            <SideBarCollapsibleSection
              title={t("schedules.running.title")}
              collapsedStateKey="is-running-schedule-tasks-collapsed"
            >
              <RunningScheduleTasks className="h-full" />
            </SideBarCollapsibleSection>
          </SideBarSplitView>
        </div>
      )}
    </SideBarSearchProvider>
  );
}

SchedulesView.componentId = "schedules";
