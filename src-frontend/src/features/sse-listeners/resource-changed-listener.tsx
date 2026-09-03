import { useEffect } from "react";

import { invalidateAgentQueries } from "@/api/agent";
import type { ResourceChangedEvent } from "@/api/generated/schemas";
import { invalidateProviderQueries } from "@/api/provider";
import { invalidateSkillQueries } from "@/api/skill";
import { invalidateScheduleQueries } from "@/api/tasks/schedule";
import { invalidateTaskQueries } from "@/api/tasks/task";
import { invalidateToolsetQueries } from "@/api/toolset";
import { invalidateWorkspaceQueries } from "@/api/workspace";
import SseDispatcher from "@/lib/sse-dispatcher";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

async function removeDeletedResourceState(data: ResourceChangedEvent) {
  if (data.operation !== "deleted") {
    return;
  }

  const removeTabs = useTabsStore.getState().remove;
  switch (data.resource_type) {
    case "workspace":
      removeTabs((tab) => tab.type === "workspace" && "id" in tab.metadata && tab.metadata.id === data.resource_id);
      if (useWorkspaceStore.getState().current?.id === data.resource_id) {
        await useWorkspaceStore.getState().setCurrent(null);
      }
      return;
    case "agent":
    case "provider":
    case "skill":
    case "toolset":
      removeTabs(
        (tab) =>
          tab.type === data.resource_type &&
          "mode" in tab.metadata &&
          tab.metadata.mode === "edit" &&
          "id" in tab.metadata &&
          tab.metadata.id === data.resource_id
      );
      return;
    case "task":
      removeTabs(
        (tab) =>
          tab.type === "task" &&
          tab.metadata.type === "task" &&
          !tab.metadata.isDraft &&
          tab.metadata.id === data.resource_id
      );
      return;
    case "schedule":
      removeTabs((tab) => tab.type === "schedule" && "id" in tab.metadata && tab.metadata.id === data.resource_id);
      return;
    default:
      return;
  }
}

export async function handleResourceChanged(data: ResourceChangedEvent) {
  await removeDeletedResourceState(data);

  switch (data.resource_type) {
    case "workspace":
      await invalidateWorkspaceQueries(data.resource_id);
      return;
    case "agent":
      await invalidateAgentQueries(data.resource_id);
      return;
    case "provider":
      await invalidateProviderQueries(data.resource_id);
      return;
    case "skill":
      await invalidateSkillQueries(data.resource_id);
      return;
    case "toolset":
      await invalidateToolsetQueries(data.resource_id);
      return;
    case "task":
      await invalidateTaskQueries({
        workspaceId: data.workspace_id,
        taskId: data.resource_id,
      });
      return;
    case "schedule":
      await invalidateScheduleQueries({
        workspaceId: data.workspace_id,
        scheduleId: data.resource_id,
      });
      return;
    default:
      return;
  }
}

export function useResourceChangedListener() {
  useEffect(
    () =>
      SseDispatcher.subscribe("RESOURCE_CHANGED", (data) => {
        handleResourceChanged(data).catch((error: unknown) => {
          console.error("Failed to refresh resource queries", error);
        });
      }),
    []
  );
}
