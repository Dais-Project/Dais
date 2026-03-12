import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";
import { FetchError } from "@/api/orval-mutator/custom-fetch";
import { getErrorMessage } from "@/i18n/error-message";

export default new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        console.error(error);
        if (error instanceof FetchError) {
          toast.error(getErrorMessage(error.errorCode), { duration: Number.POSITIVE_INFINITY });
        } else {
          toast.error(getErrorMessage("UNEXPECTED_ERROR"), { duration: Number.POSITIVE_INFINITY });
        }
      },
    },
  },
});
