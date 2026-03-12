import { i18n } from "./index";
import { ErrorCode } from "@/api/orval-mutator/custom-fetch";
import { ERROR_NAMESPACE } from "./resources";

export function getErrorMessage(errorCode: ErrorCode): string {
  if (i18n.exists(errorCode, { ns: ERROR_NAMESPACE })) {
    return i18n.t(errorCode, {
      ns: ERROR_NAMESPACE
    });
  }
  return i18n.t("UNEXPECTED_ERROR", { ns: ERROR_NAMESPACE });
}
