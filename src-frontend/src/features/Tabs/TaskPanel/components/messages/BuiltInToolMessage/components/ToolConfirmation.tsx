import { CheckIcon, XIcon } from "lucide-react";
import { nanoid } from "nanoid";
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

export function ToolConfirmation({ state, onAccept, onReject }: ToolConfirmationProps) {
  let approved: boolean | undefined;
  if (state === "approval-responded") {
    approved = true;
  }
  if (state === "output-denied") {
    approved = false;
  }

  return (
    <Confirmation
      approval={{
        id: nanoid(),
        approved,
      }}
      state={state}
      className="border-none"
    >
      <ConfirmationAccepted>
        <div className="flex items-center gap-1">
          <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
          <span>Accepted</span>
        </div>
      </ConfirmationAccepted>
      <ConfirmationRejected>
        <div className="flex items-center gap-1">
          <XIcon className="size-4 text-destructive" />
          <span>Rejected</span>
        </div>
      </ConfirmationRejected>
      <ConfirmationActions>
        <ConfirmationAction onClick={onReject} variant="outline">
          Reject
        </ConfirmationAction>
        <ConfirmationAction onClick={onAccept} variant="default">
          Accept
        </ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  );
}
