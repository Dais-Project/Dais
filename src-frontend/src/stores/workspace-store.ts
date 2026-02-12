import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FetchError } from "@/api";
import type { WorkspaceRead } from "@/api/generated/schemas";
import { getWorkspace } from "@/api/workspace";

type WorkspaceState = {
  currentWorkspace: WorkspaceRead | null;
  isLoading: boolean;
};

type WorkspaceActions = {
  setCurrentWorkspace: (workspaceId: number | null) => Promise<void>;
  syncCurrentWorkspace: (workspaceId?: number) => Promise<void>;
};

type PersistedWorkspaceState = {
  currentWorkspace: WorkspaceRead | null;
};

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      currentWorkspace: null,
      isLoading: false,
      async setCurrentWorkspace(workspaceId) {
        if (workspaceId === null) {
          set({ currentWorkspace: null });
          return;
        }
        await get().syncCurrentWorkspace(workspaceId);
      },
      async syncCurrentWorkspace(workspaceId_) {
        const workspaceId = workspaceId_ ?? get().currentWorkspace?.id;
        if (!workspaceId) {
          return;
        }

        set({ isLoading: true });
        try {
          const workspace = await getWorkspace(workspaceId);
          set({ currentWorkspace: workspace });
        } catch (error) {
          console.error("Failed to fetch workspace:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "workspace",
      partialize: (state) =>
        ({
          currentWorkspace: state.currentWorkspace,
        }) satisfies PersistedWorkspaceState,
      onRehydrateStorage: () => (hydratedState, error) => {
        if (error) {
          console.error("Failed to load workspace from storage:", error);
          return;
        }
        if (!hydratedState?.currentWorkspace) {
          return;
        }
        hydratedState.syncCurrentWorkspace().catch((syncError: FetchError) => {
          if (syncError.statusCode === 404) {
            hydratedState.setCurrentWorkspace(null);
            return;
          }
        });
      },
    }
  )
);
