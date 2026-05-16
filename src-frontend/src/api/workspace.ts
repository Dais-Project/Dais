export {
  getGetWorkspaceQueryKey,
  getGetWorkspacesInfiniteQueryKey,
  getWorkspace,
  useCreateWorkspace,
  useDeleteWorkspace,
  useGetWorkspaceSuspense,
  useGetFrequentWorkspacesSuspense,
  useGetWorkspacesSuspenseInfinite,
  useUpdateWorkspace,
  useUpdateWorkspaceNotes,
  openWorkspace,
} from "./generated/endpoints/workspace/workspace";

import queryClient from "@/query-client";
import {
  getGetWorkspaceQueryKey,
  getGetFrequentWorkspacesQueryKey,
  getGetWorkspacesInfiniteQueryKey,
} from "./generated/endpoints/workspace/workspace";

export async function invalidateWorkspaceQueries(workspaceId?: number) {
  await queryClient.invalidateQueries({ queryKey: getGetWorkspacesInfiniteQueryKey(), refetchType: "all" });
  await queryClient.invalidateQueries({ queryKey: getGetFrequentWorkspacesQueryKey(), refetchType: "all" });
  if (workspaceId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetWorkspaceQueryKey(workspaceId), refetchType: "all" });
  }
}
