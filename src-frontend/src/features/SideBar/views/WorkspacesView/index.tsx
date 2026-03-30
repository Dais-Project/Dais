import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { WorkspaceList } from "./WorkspaceList";

function openWorkspaceCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    type: "workspace",
    title: i18n.t("workspaces.tab.create_title", { ns: SIDEBAR_NAMESPACE }),
    icon: "folder-plus",
    metadata: { mode: "create" },
  });
}

export function WorkspacesView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("workspaces.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("workspaces.header.create_tooltip")}
          onClick={openWorkspaceCreateTab}
        />
      </SideBarHeader>
      <div className="flex-1">
        <AsyncBoundary skeleton={<SideBarListSkeleton />}>
          <WorkspaceList />
        </AsyncBoundary>
      </div>
    </div>
  );
}
WorkspacesView.componentId = "workspaces";
