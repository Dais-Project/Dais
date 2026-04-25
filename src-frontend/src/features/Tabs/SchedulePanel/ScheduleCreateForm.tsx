import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  invalidateScheduleQueries,
  useCreateSchedule,
} from "@/api/schedule";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { CheckboxField, NameField, SelectField } from "@/components/custom/form/fields";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectItem } from "@/components/custom/form/fields/SelectField";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import { DEFAULT_SCHEDULE_CREATE_FORM_VALUES } from "@/constants/schedule";
import {
  createFormValuesToPayload,
  type ScheduleCreateFormValues,
} from "./form-types";
import { TaskField } from "./fields/TaskField";

function DynamicConfigFields({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { control, register, getFieldState, formState } = useFormContext<ScheduleCreateFormValues>();
  const type = useWatch({ control, name: "type" });

  if (type === "cron") {
    return (
      <FieldItem
        label={t("form.config.expression.label")}
        fieldState={getFieldState("expression", formState)}
      >
        <Input
          {...register("expression", {
            required: t("form.config.expression.required"),
          })}
          disabled={disabled}
          placeholder={t("form.config.expression.placeholder")}
        />
      </FieldItem>
    );
  }

  if (type === "polling") {
    return (
      <FieldItem
        label={t("form.config.interval_sec.label")}
        fieldState={getFieldState("interval_sec", formState)}
      >
        <Input
          type="number"
          {...register("interval_sec", {
            required: t("form.config.interval_sec.required"),
            valueAsNumber: true,
            min: {
              value: 1,
              message: t("form.config.interval_sec.min"),
            },
          })}
          disabled={disabled}
          placeholder={t("form.config.interval_sec.placeholder")}
        />
      </FieldItem>
    );
  }

  return (
    <FieldItem
      label={t("form.config.run_at.label")}
      fieldState={getFieldState("run_at", formState)}
    >
      <Input
        type="datetime-local"
        {...register("run_at", {
          required: t("form.config.run_at.required"),
        })}
        disabled={disabled}
      />
    </FieldItem>
  );
}

function AgentIdField({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { register, getFieldState, formState } = useFormContext<ScheduleCreateFormValues>();

  return (
    <FieldItem
      label={t("form.agent_id.label")}
      fieldState={getFieldState("agent_id", formState)}
    >
      <Input
        type="number"
        {...register("agent_id")}
        disabled={disabled}
        placeholder={t("form.agent_id.placeholder")}
      />
    </FieldItem>
  );
}

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

      <TaskField disabled={createMutation.isPending} />

      <SelectField
        fieldName="type"
        fieldProps={{ label: t("form.type.label") }}
        controlProps={{ disabled: createMutation.isPending }}
      >
        <SelectItem value="cron">{t("form.type.option.cron")}</SelectItem>
        <SelectItem value="polling">{t("form.type.option.polling")}</SelectItem>
        <SelectItem value="delayed">{t("form.type.option.delayed")}</SelectItem>
      </SelectField>

      <DynamicConfigFields disabled={createMutation.isPending} />

      <AgentIdField disabled={createMutation.isPending} />

      <CheckboxField
        fieldName="is_enabled"
        fieldProps={{ label: t("form.is_enabled.label") }}
        controlProps={{ disabled: createMutation.isPending }}
      />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
