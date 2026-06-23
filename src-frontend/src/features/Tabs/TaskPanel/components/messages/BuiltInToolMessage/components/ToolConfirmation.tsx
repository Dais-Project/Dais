import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { Button } from "@/components/ui/button";
import type { UserApprovalStatus } from "@/api/generated/schemas";
import { RISK_MAPPINGS } from "@/components/ai-elements/tool";
import { cn } from "@/lib/utils";

type ToolConfirmationProps = {
  state: UserApprovalStatus;
  disabled?: boolean;
  riskLevel?: number;
  className?: string;
  onSubmit?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
};

export function ToolConfirmation({
  state,
  disabled,
  riskLevel,
  className,
  onSubmit,
  onAccept,
  onReject,
}: ToolConfirmationProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);

  if (state !== "pending") {
    return null;
  }

  const isHighRisk =
    riskLevel !== undefined &&
    Math.ceil(riskLevel / 10) * 10 >= RISK_MAPPINGS.risky.range[0];

  const handleAccept = () => {
    onSubmit?.();
    onAccept?.();
  };

  const handleReject = () => {
    onSubmit?.();
    onReject?.();
  };

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 px-4 pb-3 bg-card",
        className,
      )}
    >
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
        variant={isHighRisk ? "destructive" : "default"}
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
