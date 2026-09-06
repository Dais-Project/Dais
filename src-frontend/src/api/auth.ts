import queryClient from "@/query-client";
import { getGetAuthSessionQueryKey } from "./generated/endpoints/auth/auth";

export {
  useBrowserLogin,
  useCreateLoginCode,
  useDeleteAuthSession,
  useGetAuthSessionSuspense,
} from "./generated/endpoints/auth/auth";

export async function resetAuthSessionQuery() {
  await queryClient.resetQueries({ queryKey: getGetAuthSessionQueryKey() });
}
