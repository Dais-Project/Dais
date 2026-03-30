import { FileUpIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateSkillQueries, useUploadArchive } from "@/api/skill";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useTabsStore } from "@/stores/tabs-store";
import { useFileSelect } from "@/hooks/use-file-select";
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
      <SideBarHeader title={t("skills.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("skills.header.create_tooltip")}
          onClick={openSkillCreateTab}
        />
        <SideBarHeaderAction
          Icon={FileUpIcon}
          tooltip={t("skills.header.upload_tooltip")}
          onClick={handleUploadClick}
          disabled={uploadArchiveMutation.isPending}
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
