import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkspaceRead } from "@/api/generated/schemas";
import type {
  ErrorResponse,
  FetchError,
} from "@/api/orval-mutator/custom-fetch";
import { getWorkspace } from "@/api/workspace";

type WorkspaceState = {
  current: WorkspaceRead | null;
  currentPromise: Promise<WorkspaceRead> | null;
  isLoading: boolean;
};

type WorkspaceActions = {
  setCurrent: (workspaceId: number | null) => Promise<void>;
  syncCurrent: (workspaceId?: number) => Promise<void>;
};

type PersistedWorkspaceState = {
  current: WorkspaceRead | null;
};

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      current: null,
      currentPromise: null,
      isLoading: false,
      async setCurrent(workspaceId) {
        if (workspaceId === null) {
          set({
            current: null,
            currentPromise: null,
            isLoading: false,
          });
          return;
        }
        await get().syncCurrent(workspaceId);
      },
      async syncCurrent(workspaceId_) {
        const workspaceId = workspaceId_ ?? get().current?.id;
        if (!workspaceId) {
          return;
        }

        const promise = getWorkspace(workspaceId);
        const isLatestRequest = () => get().currentPromise === promise;
        set({ isLoading: true, currentPromise: promise });
        try {
          const workspace = await promise;
          isLatestRequest() && set({ current: workspace });
        } catch (error) {
          console.error(`Failed to fetch workspace ${workspaceId}:`, error);
          throw error;
        } finally {
          isLatestRequest() && set({ isLoading: false });
        }
      },
    }),
    {
      name: "workspace",
      partialize: (state) =>
        ({
          current: state.current,
        }) satisfies PersistedWorkspaceState,
      onRehydrateStorage: () => (hydratedState, error) => {
        if (error) {
          console.error("Failed to load workspace from storage:", error);
          return;
        }
        if (!hydratedState?.current) {
          return;
        }
        hydratedState
          .syncCurrent()
          .catch((syncError: FetchError<ErrorResponse>) => {
            if (syncError.statusCode === 404) {
              hydratedState.setCurrent(null);
              return;
            }
          });
      },
    }
  )
);
