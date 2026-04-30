import { useEffect } from "react";
import { StopReason } from "@/api/generated/schemas";
import { i18n } from "@/i18n";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import { sendNotification } from "@/lib/notification";
import { useTabsStore } from "@/stores/tabs-store";
import SseDispatcher from "@/lib/sse-dispatcher";

function getNotificationTitle(status: StopReason) {
  switch (status) {
    case StopReason.completed:
      return i18n.t("notification.completed.title", { ns: TABS_SCHEDULE_NAMESPACE });
    case StopReason.error:
      return i18n.t("notification.error.title", { ns: TABS_SCHEDULE_NAMESPACE });
    case StopReason.interrupted:
      return i18n.t("notification.interrupted.title", { ns: TABS_SCHEDULE_NAMESPACE });
    case StopReason.pending_approve:
      return i18n.t("notification.pending_approve.title", { ns: TABS_SCHEDULE_NAMESPACE });
  }
}

function getNotificationBody(status: StopReason, scheduleName: string) {
  switch (status) {
    case StopReason.completed:
      return i18n.t("notification.completed.body_with_name", { ns: TABS_SCHEDULE_NAMESPACE, name: scheduleName });
    case StopReason.error:
      return i18n.t("notification.error.body_with_name", { ns: TABS_SCHEDULE_NAMESPACE, name: scheduleName });
    case StopReason.interrupted:
      return i18n.t("notification.interrupted.body_with_name", { ns: TABS_SCHEDULE_NAMESPACE, name: scheduleName });
    case StopReason.pending_approve:
      return i18n.t("notification.pending_approve.body_with_name", { ns: TABS_SCHEDULE_NAMESPACE, name: scheduleName });
  }
}

function openScheduleRecordTab(workspaceId: number, scheduleName: string, runRecordId: number) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find((tab) => (
    tab.type === "task" &&
    tab.metadata.type === "schedule" &&
    tab.metadata.id === runRecordId
  ));

  if (existingTab) {
    setActiveTab(existingTab.id);
    return;
  }

  addTab({
    title: `${scheduleName} #${runRecordId}`,
    icon: "history",
    type: "task",
    metadata: {
      type: "schedule",
      id: runRecordId,
      workspace_id: workspaceId,
    },
  });
}

export function useScheduleNotificationListener() {
  useEffect(() => (
    SseDispatcher.subscribe("SCHEDULE_RUN_COMPLETED", (data) => {
      const title = getNotificationTitle(data.status);
      const body = getNotificationBody(data.status, data.schedule_name);
      const options = {
        body,
        onClick: data.status === StopReason.completed
          ? undefined
          : () => openScheduleRecordTab(data.workspace_id, data.schedule_name, data.run_record_id),
      };
      sendNotification(title, options);
    })
  ), []);
}
