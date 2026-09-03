import { beforeEach, describe, expect, test, vi } from "vitest";

import { invalidateAgentQueries } from "@/api/agent";
import { invalidateProviderQueries } from "@/api/provider";
import { invalidateSkillQueries } from "@/api/skill";
import { invalidateScheduleQueries } from "@/api/tasks/schedule";
import { invalidateTaskQueries } from "@/api/tasks/task";
import { invalidateToolsetQueries } from "@/api/toolset";
import { invalidateWorkspaceQueries } from "@/api/workspace";
import { handleResourceChanged } from "@/features/sse-listeners/resource-changed-listener";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

vi.mock("@/api/agent", () => ({ invalidateAgentQueries: vi.fn() }));
vi.mock("@/api/provider", () => ({ invalidateProviderQueries: vi.fn() }));
vi.mock("@/api/skill", () => ({ invalidateSkillQueries: vi.fn() }));
vi.mock("@/api/tasks/schedule", () => ({ invalidateScheduleQueries: vi.fn() }));
vi.mock("@/api/tasks/task", () => ({ invalidateTaskQueries: vi.fn() }));
vi.mock("@/api/toolset", () => ({ invalidateToolsetQueries: vi.fn() }));
vi.mock("@/api/workspace", () => ({ invalidateWorkspaceQueries: vi.fn() }));
vi.mock("@/lib/sse-dispatcher", () => ({ default: { subscribe: vi.fn() } }));
vi.mock("@/stores/tabs-store", () => ({
  useTabsStore: { getState: vi.fn() },
}));
vi.mock("@/stores/workspace-store", () => ({
  useWorkspaceStore: { getState: vi.fn() },
}));

describe("handleResourceChanged", () => {
  const removeTabs = vi.fn();
  const setCurrentWorkspace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTabsStore.getState).mockReturnValue({ remove: removeTabs } as ReturnType<
      typeof useTabsStore.getState
    >);
    vi.mocked(useWorkspaceStore.getState).mockReturnValue({
      current: null,
      setCurrent: setCurrentWorkspace,
    } as ReturnType<typeof useWorkspaceStore.getState>);
  });

  test.each([
    ["workspace", invalidateWorkspaceQueries],
    ["agent", invalidateAgentQueries],
    ["provider", invalidateProviderQueries],
    ["skill", invalidateSkillQueries],
    ["toolset", invalidateToolsetQueries],
  ] as const)("invalidates %s queries", async (resourceType, invalidateQueries) => {
    await handleResourceChanged({
      event_id: "RESOURCE_CHANGED",
      resource_type: resourceType,
      operation: "created",
      resource_id: 7,
    });

    expect(invalidateQueries).toHaveBeenCalledWith(7);
  });

  test("invalidates task list and detail queries", async () => {
    await handleResourceChanged({
      event_id: "RESOURCE_CHANGED",
      resource_type: "task",
      operation: "deleted",
      resource_id: 11,
      workspace_id: 4,
    });

    expect(invalidateTaskQueries).toHaveBeenCalledWith({
      workspaceId: 4,
      taskId: 11,
    });
  });

  test("invalidates schedule list and detail queries", async () => {
    await handleResourceChanged({
      event_id: "RESOURCE_CHANGED",
      resource_type: "schedule",
      operation: "created",
      resource_id: 13,
      workspace_id: 6,
    });

    expect(invalidateScheduleQueries).toHaveBeenCalledWith({
      workspaceId: 6,
      scheduleId: 13,
    });
  });
  test.each([
    ["workspace", invalidateWorkspaceQueries],
    ["agent", invalidateAgentQueries],
    ["provider", invalidateProviderQueries],
    ["skill", invalidateSkillQueries],
    ["toolset", invalidateToolsetQueries],
  ] as const)("invalidates %s queries on updated operation", async (resourceType, invalidateQueries) => {
    await handleResourceChanged({
      event_id: "RESOURCE_CHANGED",
      resource_type: resourceType,
      operation: "updated",
      resource_id: 8,
    });

    expect(invalidateQueries).toHaveBeenCalledWith(8);
    expect(removeTabs).not.toHaveBeenCalled();
  });

  test("clears deleted current workspace and related tabs", async () => {
    vi.mocked(useWorkspaceStore.getState).mockReturnValue({
      current: { id: 17 },
      setCurrent: setCurrentWorkspace,
    } as ReturnType<typeof useWorkspaceStore.getState>);

    await handleResourceChanged({
      event_id: "RESOURCE_CHANGED",
      resource_type: "workspace",
      operation: "deleted",
      resource_id: 17,
    });

    expect(removeTabs).toHaveBeenCalledOnce();
    expect(setCurrentWorkspace).toHaveBeenCalledWith(null);
  });

  test("removes a deleted task tab", async () => {
    await handleResourceChanged({
      event_id: "RESOURCE_CHANGED",
      resource_type: "task",
      operation: "deleted",
      resource_id: 19,
      workspace_id: 2,
    });

    const predicate = removeTabs.mock.calls[0][0];
    expect(
      predicate({
        type: "task",
        metadata: { type: "task", isDraft: false, id: 19, workspace_id: 2 },
      })
    ).toBe(true);
    expect(
      predicate({
        type: "task",
        metadata: { type: "task", isDraft: true, workspace_id: 2 },
      })
    ).toBe(false);
  });
});
