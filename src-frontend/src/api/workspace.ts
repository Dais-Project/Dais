export {
  getGetWorkspaceQueryKey,
  getGetWorkspacesInfiniteQueryKey,
  getWorkspace,
  useCreateWorkspace,
  useDeleteWorkspace,
  useGetWorkspaceSuspense,
  useGetWorkspacesSuspenseInfinite,
  useUpdateWorkspace,
} from "./generated/endpoints/workspace/workspace";

import queryClient from "@/query-client";
import {
  getGetWorkspaceQueryKey,
  getGetWorkspacesInfiniteQueryKey,
} from "./generated/endpoints/workspace/workspace";

export async function invalidateWorkspaceQueries(workspaceId?: number) {
  await queryClient.invalidateQueries({ queryKey: getGetWorkspacesInfiniteQueryKey() });
  if (workspaceId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetWorkspaceQueryKey(workspaceId) });
  }
}
