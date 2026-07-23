import { useDebounce } from "ahooks";
import { FileUpIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateSkillQueries, useUploadArchive } from "@/api/skill";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ExpandableSearchBar } from "@/components/custom/form/ExtendableSearchInput";
import { ButtonGroup } from "@/components/ui/button-group";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { useFileSelect } from "@/hooks/use-file-select";
import { InstallFromGithubDialog } from "./InstallFromGithubDialog";
import { SkillList } from "./SkillList";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";

function openSkillCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    type: "skill",
    title: i18n.t("skills.tab.create_title", { ns: SIDEBAR_NAMESPACE }),
    icon: "scroll-text",
    metadata: { mode: "create" },
  });
}

export function SkillsView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [searchValue, setSearchValue] = useState("");

  const { inputProps, open: openFileDialog } = useFileSelect({
    accept: ".zip,application/zip",
    multiple: false,
    onSelect: (file) => {
      if (file && !uploadArchiveMutation.isPending) {
        uploadArchiveMutation.mutate({ data: { file } });
      }
    },
  });

  const uploadArchiveMutation = useUploadArchive({
    mutation: {
      async onSuccess() {
        await invalidateSkillQueries();
        toast.success(t("skills.toast.upload_success_title"), {
          description: t("skills.toast.upload_success_description"),
        });
      },
    },
  });

  const handleUploadClick = () => {
    if (uploadArchiveMutation.isPending) {
      return;
    }
    openFileDialog();
  };

  return (
    <div className="flex h-full flex-col">
      <input {...inputProps} className="hidden" />
      <SideBarHeader title={t("skills.header.title")} actionsClass="flex-1 ml-4">
        <ExpandableSearchBar
          className="flex-1"
          expandDirection="left"
          placeholder={t("skills.header.search_placeholder")}
          onValueChange={setSearchValue}
        />
        <ButtonGroup>
          <SideBarHeaderAction
            Icon={PlusIcon}
            tooltip={t("skills.header.create_tooltip")}
            onClick={openSkillCreateTab}
          />
          <InstallFromGithubDialog />
          <SideBarHeaderAction
            Icon={FileUpIcon}
            tooltip={t("skills.header.upload_tooltip")}
            onClick={handleUploadClick}
            disabled={uploadArchiveMutation.isPending}
          />
        </ButtonGroup>
      </SideBarHeader>
      <div className="flex-1 min-h-0">
        <AsyncBoundary skeleton={<SideBarListSkeleton />}>
          <SkillList searchQuery={searchValue} />
        </AsyncBoundary>
      </div>
    </div>
  );
}
SkillsView.componentId = "skills";
