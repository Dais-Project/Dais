import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { SkillList } from "./SkillList";

function openSkillCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    id: tabIdFactory(),
    type: "skill",
    title: i18n.t("skills.tab.create_title", { ns: SIDEBAR_NAMESPACE }),
    icon: "scroll-text",
    metadata: { mode: "create" },
  });
}

export function SkillsView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("skills.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("skills.header.create_tooltip")}
          onClick={openSkillCreateTab}
        />
      </SideBarHeader>
      <div className="flex-1">
        <AsyncBoundary skeleton={<SideBarListSkeleton />}>
          <SkillList />
        </AsyncBoundary>
      </div>
    </div>
  );
}
SkillsView.componentId = "skills";
