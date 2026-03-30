import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { AgentList } from "./AgentList";

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
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("agents.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("agents.header.create_tooltip")}
          onClick={openAgentCreateTab}
        />
      </SideBarHeader>
      <div className="flex-1">
        <AsyncBoundary skeleton={<SideBarListSkeleton />}>
          <AgentList />
        </AsyncBoundary>
      </div>
    </div>
  );
}
AgentsView.componentId = "agents";
