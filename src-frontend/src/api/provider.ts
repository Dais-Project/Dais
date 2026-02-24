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
  await queryClient.invalidateQueries({ queryKey: getGetProvidersBriefQueryKey() });
  await queryClient.invalidateQueries({ queryKey: getGetProvidersInfiniteQueryKey() });
  if (providerId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: getGetProviderQueryKey(providerId) });
  }
}
