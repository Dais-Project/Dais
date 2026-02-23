export {
  getGetToolsetQueryKey,
  getGetToolsetsBriefQueryKey,
  useCreateMcpToolset,
  useDeleteToolset,
  useGetToolsetSuspense,
  useGetToolsetsBriefSuspense,
  useUpdateToolset,
} from "./generated/endpoints/toolset/toolset";

import queryClient from "@/query-client";
import {
  getGetToolsetQueryKey,
  getGetToolsetsBriefQueryKey,
} from "./generated/endpoints/toolset/toolset";

export async function invalidateToolsetQueries(toolsetId?: number) {
  await queryClient.invalidateQueries({ queryKey: getGetToolsetsBriefQueryKey() });
  if (toolsetId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetToolsetQueryKey(toolsetId) });
  }
}
