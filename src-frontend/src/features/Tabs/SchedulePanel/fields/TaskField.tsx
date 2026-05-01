import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import type { ScheduleCreateFormValues, ScheduleEditFormValues } from "../form-types";

type TaskFieldFormValues = ScheduleCreateFormValues | ScheduleEditFormValues;

type TaskFieldProps = {
  disabled: boolean;
};

export function TaskField({ disabled }: TaskFieldProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { register, getFieldState, formState } = useFormContext<TaskFieldFormValues>();

  return (
    <FieldItem
      label={t("form.task.label")}
      fieldState={getFieldState("task", formState)}
      orientation="vertical"
      align="start"
      contentClassName="w-full justify-start"
    >
      <Textarea
        {...register("task", {
          required: t("form.task.required"),
        })}
        disabled={disabled}
        placeholder={t("form.task.placeholder")}
        minRows={3}
        className="w-full min-w-0 max-h-40 resize-none"
      />
    </FieldItem>
  );
}
