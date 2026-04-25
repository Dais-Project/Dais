import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SideBarHeader, SideBarHeaderAction } from "../../components/SideBarHeader";
import { SideBarListSkeleton } from "../../components/SideBarListSkeleton";
import { ScheduleList } from "./ScheduleList";

function CurrentWorkspaceSchedules({
  workspaceId,
  className,
}: {
  workspaceId?: number;
  className?: string;
}) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  if (!workspaceId) {
    return (
      <Empty className={className}>
        <EmptyContent>
          <EmptyTitle>{t("schedules.empty.no_workspace.title")}</EmptyTitle>
          <EmptyDescription>{t("schedules.empty.no_workspace.description")}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className={className}>
      <AsyncBoundary skeleton={<SideBarListSkeleton />}>
        <ScheduleList workspaceId={workspaceId} />
      </AsyncBoundary>
    </div>
  );
}

export function SchedulesView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const currentWorkspace = useWorkspaceStore((state) => state.current);

  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("schedules.header.title")}>
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip={t("schedules.header.create_tooltip")}
          disabled
        />
      </SideBarHeader>

      <CurrentWorkspaceSchedules
        className="flex-1 min-h-0"
        workspaceId={currentWorkspace?.id}
      />
    </div>
  );
}

SchedulesView.componentId = "schedules";
