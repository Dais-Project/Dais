import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ExpandableSearchBar } from "@/components/custom/form/ExtendableSearchInput";
import { i18n } from "@/i18n";
import { SIDEBAR_WORKSPACE_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { SideBarSearchProvider } from "../../components/SideBarSearchContext";
import { WorkspaceList } from "./WorkspaceList";

function openWorkspaceCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    type: "workspace",
    title: i18n.t("tab.create_title", { ns: SIDEBAR_WORKSPACE_NAMESPACE }),
    icon: "folder-plus",
    metadata: { mode: "create" },
  });
}

export function WorkspacesView() {
  const { t } = useTranslation(SIDEBAR_WORKSPACE_NAMESPACE);

  return (
    <SideBarSearchProvider>
      {({ normalizedQuery, setQuery }) => (
        <div className="flex h-full flex-col">
          <SideBarHeader title={t("header.title")} actionsClass="flex-1 ml-4">
            <ExpandableSearchBar
              className="flex-1"
              expandDirection="left"
              placeholder={t("header.search_placeholder")}
              onValueChange={setQuery}
            />
            <SideBarHeaderAction
              Icon={PlusIcon}
              tooltip={t("header.create_tooltip")}
              onClick={openWorkspaceCreateTab}
            />
          </SideBarHeader>
          <div className="flex-1 min-h-0">
            <AsyncBoundary skeleton={<SideBarListSkeleton />}>
              <WorkspaceList searchQuery={normalizedQuery} />
            </AsyncBoundary>
          </div>
        </div>
      )}
    </SideBarSearchProvider>
  );
}
WorkspacesView.componentId = "workspaces";
