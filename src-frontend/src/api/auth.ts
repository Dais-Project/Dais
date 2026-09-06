import queryClient from "@/query-client";
import { getGetAuthSessionQueryKey } from "./generated/endpoints/auth/auth";

export {
  useBrowserLogin,
  useCreateLoginCode,
  useGetAuthSessionSuspense,
} from "./generated/endpoints/auth/auth";

export function invalidateAuthSessionQuery() {
  return queryClient.invalidateQueries({
    queryKey: getGetAuthSessionQueryKey(),
  });
}
