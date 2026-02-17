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
      isLoading: false,
      async setCurrent(workspaceId) {
        if (workspaceId === null) {
          set({ current: null });
          return;
        }
        await get().syncCurrent(workspaceId);
      },
      async syncCurrent(workspaceId_) {
        const workspaceId = workspaceId_ ?? get().current?.id;
        if (!workspaceId) {
          return;
        }

        set({ isLoading: true });
        try {
          const workspace = await getWorkspace(workspaceId);
          set({ current: workspace });
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
