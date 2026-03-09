import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { i18n } from "@/i18n";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { ToolsetList } from "./ToolsetList";

function openToolsetCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    id: tabIdFactory(),
    type: "toolset",
    title: i18n.t("toolsets.tab.create_title", { ns: "sidebar" }),
    metadata: { mode: "create" },
  });
}

export function ToolsetsView() {
  const { t } = useTranslation("sidebar");

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("toolsets.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("toolsets.header.create_tooltip")}
          onClick={openToolsetCreateTab}
        />
      </SideBarHeader>
      <div className="flex-1">
        <AsyncBoundary
          skeleton={<SideBarListSkeleton />}
          errorDescription={t("toolsets.list.error_load")}
        >
          <ToolsetList />
        </AsyncBoundary>
      </div>
    </div>
  );
}
ToolsetsView.componentId = "toolsets";
