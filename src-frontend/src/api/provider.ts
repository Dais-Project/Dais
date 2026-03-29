export {
  getGetProviderQueryKey,
  getGetProvidersBriefQueryKey,
  getGetProvidersInfiniteQueryKey,
  useCreateProvider,
  useDeleteProvider,
  useGetProviderSuspense,
  useGetProvidersBriefSuspense,
  useGetProvidersSuspenseInfinite,
  useUpdateProvider,
} from "./generated/endpoints/provider/provider";

import queryClient from "@/query-client";
import {
  getGetProviderQueryKey,
  getGetProvidersBriefQueryKey,
  getGetProvidersInfiniteQueryKey,
} from "./generated/endpoints/provider/provider";

export async function invalidateProviderQueries(providerId?: number) {
  await queryClient.invalidateQueries({ queryKey: getGetProvidersBriefQueryKey(), refetchType: "all" });
  await queryClient.invalidateQueries({ queryKey: getGetProvidersInfiniteQueryKey(), refetchType: "all" });
  if (providerId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetProviderQueryKey(providerId), refetchType: "all" });
  }
}
