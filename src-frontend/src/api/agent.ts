export {
  getGetAgentQueryKey,
  getGetAgentsInfiniteQueryKey,
  useCreateAgent,
  useDeleteAgent,
  useGetAgentSuspense,
  useGetAgentsSuspenseInfinite,
  useUpdateAgent,
} from "./generated/endpoints/agent/agent";

import queryClient from "@/query-client";
import {
  getGetAgentQueryKey,
  getGetAgentsInfiniteQueryKey,
} from "./generated/endpoints/agent/agent";

export async function invalidateAgentQueries(agentId?: number) {
  await queryClient.invalidateQueries({ queryKey: getGetAgentsInfiniteQueryKey() });
  if (agentId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetAgentQueryKey(agentId) });
  }
}
