import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ScheduleRead } from "@/api/generated/schemas";
import {
  invalidateScheduleQueries,
  useUpdateSchedule,
} from "@/api/tasks/schedule";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { CheckboxField, NameField, SelectField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/custom/form/fields/SelectField";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import {
  editFormValuesToPayload,
  scheduleToEditFormValues,
  type ScheduleEditFormValues,
} from "./form-types";
import { DynamicConfigFields } from "./fields/DynamicConfigFields";
import { AgentSelectField } from "./fields/AgentSelectField";
import { TaskField } from "./fields/TaskField";

type ScheduleEditFormProps = {
  schedule: ScheduleRead;
  onConfirm?: () => void;
};

export function ScheduleEditForm({ schedule, onConfirm }: ScheduleEditFormProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);

  const updateMutation = useUpdateSchedule({
    mutation: {
      async onSuccess(updatedSchedule) {
        await invalidateScheduleQueries({
          workspaceId: updatedSchedule.workspace_id,
          scheduleId: updatedSchedule.id,
        });
        toast.success(t("toast.update.success_title"), {
          description: t("toast.update.success_description_with_name", {
            name: updatedSchedule.name,
          }),
        });
        onConfirm?.();
      },
    },
  });

  function handleSubmit(values: ScheduleEditFormValues) {
    updateMutation.mutate({
      scheduleId: schedule.id,
      data: editFormValuesToPayload(values),
    });
  }

  return (
    <FormShell<ScheduleEditFormValues>
      values={scheduleToEditFormValues(schedule)}
      onSubmit={handleSubmit}
    >
      <NameField
        fieldName="name"
        fieldProps={{ label: t("form.name.label") }}
        controlProps={{ placeholder: t("form.name.placeholder"), disabled: updateMutation.isPending }}
      />

      <CheckboxField
        fieldName="is_enabled"
        fieldProps={{ label: t("form.is_enabled.label") }}
        controlProps={{ disabled: updateMutation.isPending }}
      />

      <AgentSelectField disabled={updateMutation.isPending} workspaceId={schedule.workspace_id} />

      <TaskField disabled={updateMutation.isPending} />

      <SelectField
        fieldName="config.type"
        fieldProps={{ label: t("form.type.label") }}
        controlProps={{ disabled: updateMutation.isPending }}
      >
        <SelectItem value="cron">{t("form.type.option.cron")}</SelectItem>
        <SelectItem value="polling">{t("form.type.option.polling")}</SelectItem>
        <SelectItem value="delayed">{t("form.type.option.delayed")}</SelectItem>
      </SelectField>

      <DynamicConfigFields disabled={updateMutation.isPending} />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? t("form.submit.saving") : t("form.submit.save")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
