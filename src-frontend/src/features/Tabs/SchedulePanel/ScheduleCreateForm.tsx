import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  invalidateScheduleQueries,
  useCreateSchedule,
} from "@/api/tasks/schedule";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, SelectField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/custom/form/fields/SelectField";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import { DEFAULT_SCHEDULE_CREATE_FORM_VALUES } from "@/constants/schedule";
import {
  createFormValuesToPayload,
  type ScheduleCreateFormValues,
} from "./form-types";
import { DynamicConfigFields } from "./fields/DynamicConfigFields";
import { AgentSelectField } from "./fields/AgentSelectField";
import { TaskField } from "./fields/TaskField";


type ScheduleCreateFormProps = {
  workspaceId: number;
  onConfirm?: () => void;
};

export function ScheduleCreateForm({ workspaceId, onConfirm }: ScheduleCreateFormProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);

  const createMutation = useCreateSchedule({
    mutation: {
      async onSuccess(newSchedule) {
        await invalidateScheduleQueries({
          workspaceId,
          scheduleId: newSchedule.id,
        });
        toast.success(t("toast.create.success_title"), {
          description: t("toast.create.success_description_with_name", {
            name: newSchedule.name,
          }),
        });
        onConfirm?.();
      },
    },
  });

  function handleSubmit(values: ScheduleCreateFormValues) {
    const payload = createFormValuesToPayload(values, workspaceId);
    createMutation.mutate({ data: payload });
  }

  return (
    <FormShell<ScheduleCreateFormValues>
      values={DEFAULT_SCHEDULE_CREATE_FORM_VALUES}
      onSubmit={handleSubmit}
    >
      <NameField
        fieldName="name"
        fieldProps={{ label: t("form.name.label") }}
        controlProps={{ placeholder: t("form.name.placeholder"), disabled: createMutation.isPending }}
      />

      <AgentSelectField disabled={createMutation.isPending} workspaceId={workspaceId} />

      <TaskField disabled={createMutation.isPending} />

      <SelectField
        fieldName="config.type"
        fieldProps={{ label: t("form.type.label") }}
        controlProps={{ disabled: createMutation.isPending }}
      >
        <SelectItem value="cron">{t("form.type.option.cron")}</SelectItem>
        <SelectItem value="polling">{t("form.type.option.polling")}</SelectItem>
        <SelectItem value="delayed">{t("form.type.option.delayed")}</SelectItem>
      </SelectField>

      <DynamicConfigFields disabled={createMutation.isPending} />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
