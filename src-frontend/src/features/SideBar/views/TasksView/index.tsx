import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { TaskList } from "./TaskList";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { i18n } from "@/i18n";

function openTaskCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    id: tabIdFactory(),
    title: i18n.t("tab.default_title", { ns: TABS_TASK_NAMESPACE }),
    type: "task",
    metadata: {
      isDraft: true,
    },
  });
}

export function TasksView() {
  const { t } = useTranslation("sidebar");
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  const Content = () => {
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
      <AsyncBoundary skeleton={<SideBarListSkeleton />} errorDescription={t("tasks.list.error_load")}>
        <TaskList workspaceId={currentWorkspace.id} />
      </AsyncBoundary>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("tasks.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("tasks.header.create_tooltip")}
          onClick={openTaskCreateTab}
        />
      </SideBarHeader>
      <div className="h-full min-h-0 flex-1">
        <Content />
      </div>
    </div>
  );
}
TasksView.componentId = "tasks";
