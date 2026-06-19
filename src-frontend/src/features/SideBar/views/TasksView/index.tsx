import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  Empty,
  EmptyTitle,
  EmptyContent,
  EmptyDescription,
} from "@/components/ui/empty";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { TaskList } from "./TaskList";
import { RecentTaskList } from "./RecentTaskList";
import { openTaskCreateTab } from "./shared";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { SideBarCollapsibleSection, SideBarPrimarySection, SideBarSplitView } from "../../components/SideBarSplitView";

function CurrentWorkspaceTasks({ workspaceId, className }: {
  workspaceId?: number,
  className?: string,
}) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  if (!workspaceId) {
    return (
      <Empty className={className}>
        <EmptyContent>
          <EmptyTitle>{t("tasks.empty.no_workspace.title")}</EmptyTitle>
          <EmptyDescription>{t("tasks.empty.no_workspace.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <TaskList workspaceId={workspaceId} />
      </AsyncBoundary>
    </div>
  );
}

function RecentTasks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <RecentTaskList />
      </AsyncBoundary>
    </div>
  );
}

export function TasksView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("tasks.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("tasks.header.create_tooltip")}
          onClick={() => currentWorkspace && openTaskCreateTab(currentWorkspace.id)}
          disabled={currentWorkspace === null}
        />
      </SideBarHeader>
      <SideBarSplitView>
        <SideBarPrimarySection>
          <CurrentWorkspaceTasks className="h-full" workspaceId={currentWorkspace?.id} />
        </SideBarPrimarySection>
        <SideBarCollapsibleSection
          title="最近任务"
          collapsedStateKey="is-recent-tasks-collapsed"
        >
          <RecentTasks className="h-full" />
        </SideBarCollapsibleSection>
      </SideBarSplitView>
    </div>
  );
}
TasksView.componentId = "tasks";
