import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ExpandableSearchBar } from "@/components/custom/form/ExtendableSearchInput";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { SideBarSearchProvider } from "../../components/SideBarSearchContext";
import { ToolsetList } from "./ToolsetList";

function openToolsetCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    type: "toolset",
    title: i18n.t("toolsets.tab.create_title", { ns: SIDEBAR_NAMESPACE }),
    metadata: { mode: "create" },
  });
}

export function ToolsetsView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <SideBarSearchProvider>
      {({ normalizedQuery, setQuery }) => (
        <div className="flex h-full flex-col">
          <SideBarHeader title={t("toolsets.header.title")} actionsClass="flex-1 ml-4">
            <ExpandableSearchBar
              className="flex-1"
              expandDirection="left"
              placeholder={t("toolsets.header.search_placeholder")}
              onValueChange={setQuery}
            />
            <SideBarHeaderAction
              Icon={PlusIcon}
              tooltip={t("toolsets.header.create_tooltip")}
              onClick={openToolsetCreateTab}
            />
          </SideBarHeader>
          <div className="flex-1 min-h-0">
            <AsyncBoundary skeleton={<SideBarListSkeleton />}>
              <ToolsetList searchQuery={normalizedQuery} />
            </AsyncBoundary>
          </div>
        </div>
      )}
    </SideBarSearchProvider>
  );
}
ToolsetsView.componentId = "toolsets";
