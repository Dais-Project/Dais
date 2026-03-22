import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { Button } from "@/components/ui/button";
import { UserApprovalStatus } from "@/api/generated/schemas";

type ToolConfirmationProps = {
  state: UserApprovalStatus;
  disabled?: boolean;
  onSubmit?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
};

export function ToolConfirmation({
  state,
  disabled,
  onSubmit,
  onAccept,
  onReject
}: ToolConfirmationProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);

  if (state !== "pending") {
    return null;
  }

  const handleAccept = () => {
    onSubmit?.();
    onAccept?.();
  };

  const handleReject = () => {
    onSubmit?.();
    onReject?.();
  };

  return (
    <div className="flex items-center justify-end gap-2 px-4 pb-3">
      <Button
        variant="outline"
        disabled={disabled}
        onClick={handleReject}
        type="button"
        className="h-8 px-3 text-sm"
      >
        {t("tool.confirmation.reject")}
      </Button>
      <Button
        variant="default"
        disabled={disabled}
        onClick={handleAccept}
        type="button"
        className="h-8 px-3 text-sm"
      >
        {t("tool.confirmation.accept")}
      </Button>
    </div>
  );

}
