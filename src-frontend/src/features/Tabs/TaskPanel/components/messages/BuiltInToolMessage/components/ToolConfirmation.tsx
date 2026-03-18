import { CheckIcon, XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
} from "@/components/ai-elements/confirmation";
import type { ToolState } from "@/components/ai-elements/tool";

type ToolConfirmationProps = {
  state: ToolState;
  onAccept?: () => void;
  onReject?: () => void;
};

export function shouldShowConfirmation(state: ToolState): boolean {
  return ["approval-requested", "approval-responded", "output-denied"].includes(state);
}

export function resolveToolState(state: ToolState): boolean | undefined {
  let approved: boolean | undefined;
  if (state === "approval-responded") {
    approved = true;
  }
  if (state === "output-denied") {
    approved = false;
  }
  return approved;
}

export function ToolConfirmation({ state, onAccept, onReject }: ToolConfirmationProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const approved = resolveToolState(state);

  return (
    <Confirmation
      approval={{ id: nanoid(), approved }}
      state={state}
      className="border-none"
    >
      <ConfirmationAccepted>
        <div className="flex items-center gap-1">
          <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
          <span>{t("tool.confirmation.accepted")}</span>
        </div>
      </ConfirmationAccepted>
      <ConfirmationRejected>
        <div className="flex items-center gap-1">
          <XIcon className="size-4 text-destructive" />
          <span>{t("tool.confirmation.rejected")}</span>
        </div>
      </ConfirmationRejected>
      <ConfirmationActions>
        <ConfirmationAction onClick={onReject} variant="outline">
          {t("tool.confirmation.reject")}
        </ConfirmationAction>
        <ConfirmationAction onClick={onAccept} variant="default">
          {t("tool.confirmation.accept")}
        </ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  );
}
