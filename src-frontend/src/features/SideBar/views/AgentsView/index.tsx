import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ExpandableSearchBar } from "@/components/custom/form/ExtendableSearchInput";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { AgentList } from "./AgentList";
import { SideBarSearchProvider } from "../../components/SideBarSearchContext";

function openAgentCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    type: "agent",
    title: i18n.t("agents.tab.create_title", { ns: SIDEBAR_NAMESPACE }),
    icon: "bot",
    metadata: { mode: "create" },
  });
}

export function AgentsView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <SideBarSearchProvider>
      {({ normalizedQuery, setQuery }) => (
        <div className="flex h-full flex-col">
          <SideBarHeader title={t("agents.header.title")} actionsClass="flex-1 ml-4">
            <ExpandableSearchBar
              className="flex-1"
              expandDirection="left"
              placeholder={t("agents.header.search_placeholder")}
              onValueChange={setQuery}
            />
            <SideBarHeaderAction
              Icon={PlusIcon}
              tooltip={t("agents.header.create_tooltip")}
              onClick={openAgentCreateTab}
            />
          </SideBarHeader>
          <div className="flex-1 min-h-0">
            <AsyncBoundary skeleton={<SideBarListSkeleton />}>
              <AgentList searchQuery={normalizedQuery} />
            </AsyncBoundary>
          </div>
        </div>
      )}
    </SideBarSearchProvider>
  );
}
AgentsView.componentId = "agents";
