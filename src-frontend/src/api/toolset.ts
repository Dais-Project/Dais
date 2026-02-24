export {
  getGetToolsetQueryKey,
  getGetToolsetsQueryKey,
  getGetToolsetsBriefQueryKey,
  useCreateMcpToolset,
  useDeleteToolset,
  useGetToolsetSuspense,
  useGetToolsetsSuspense,
  useGetToolsetsBriefSuspense,
  useUpdateToolset,
} from "./generated/endpoints/toolset/toolset";

import queryClient from "@/query-client";
import {
  getGetToolsetQueryKey,
  getGetToolsetsQueryKey,
  getGetToolsetsBriefQueryKey,
} from "./generated/endpoints/toolset/toolset";

export async function invalidateToolsetQueries(toolsetId?: number) {
  await queryClient.invalidateQueries({ queryKey: getGetToolsetsQueryKey() });
  await queryClient.invalidateQueries({ queryKey: getGetToolsetsBriefQueryKey() });
  if (toolsetId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetToolsetQueryKey(toolsetId) });
  }
}
