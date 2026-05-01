import { useTranslation } from "react-i18next";
import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import { AgentSelectDialog } from "@/components/custom/dialog/resource-dialog/AgentSelectDialog";
import type { ScheduleCreateFormValues, ScheduleEditFormValues } from "../form-types";

type AgentSelectFieldProps = {
  disabled: boolean;
  workspaceId: number;
};

export function AgentSelectField({
  disabled,
  workspaceId,
}: AgentSelectFieldProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { control } = useFormContext<ScheduleCreateFormValues | ScheduleEditFormValues>();

  return (
    <Controller
      name="agent_id"
      control={control}
      render={({ field, fieldState }) => (
        <FieldItem
          label={t("form.agent_id.label")}
          fieldState={fieldState}
        >
          <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
            <AgentSelectDialog
              agentId={field.value}
              workspaceId={workspaceId}
              onChange={field.onChange}
            />
          </div>
        </FieldItem>
      )}
    />
  );
}
