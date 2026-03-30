import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18n } from "@/i18n";
import { TABS_TASK_NAMESPACE, SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  Empty,
  EmptyTitle,
  EmptyContent,
  EmptyDescription,
} from "@/components/ui/empty";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { TaskList } from "./TaskList";

function openTaskCreateTab(workspaceId: number) {
  const addTab = useTabsStore.getState().add;
  addTab({
    title: i18n.t("tab.default_title", { ns: TABS_TASK_NAMESPACE }),
    type: "task",
    metadata: {
      isDraft: true,
      workspace_id: workspaceId,
    },
  });
}

export function TasksView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  const content = (() => {
    if (!currentWorkspace) {
      return (
        <Empty>
          <EmptyContent>
            <EmptyTitle>{t("tasks.empty.no_workspace.title")}</EmptyTitle>
            <EmptyDescription>{t("tasks.empty.no_workspace.description")}</EmptyDescription>
          </EmptyContent>
        </Empty>
      );
    }

    return (
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <TaskList workspaceId={currentWorkspace.id} />
      </AsyncBoundary>
    );
  })();

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
      <div className="h-full min-h-0 flex-1">
        {content}
      </div>
    </div>
  );
}
TasksView.componentId = "tasks";
