import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
import { DateTimeField, IntervalPickerField } from "@/components/custom/form/fields";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type {
  ScheduleCreateFormValues,
  ScheduleEditFormValues,
} from "../form-types";

type ScheduleFormValues = ScheduleCreateFormValues | ScheduleEditFormValues;

type DynamicConfigFieldsProps = {
  disabled: boolean;
};

export function DynamicConfigFields({ disabled }: DynamicConfigFieldsProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { control, register, getFieldState, formState } = useFormContext<ScheduleFormValues>();
  const type = useWatch({ control, name: "config.type" });

  if (type === "cron") {
    return (
      <FieldItem
        label={t("form.config.expression.label")}
        fieldState={getFieldState("config.expression", formState)}
      >
        <Input
          {...register("config.expression", {
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
      <IntervalPickerField
        fieldName="config.interval_sec"
        fieldProps={{ label: t("form.config.interval_sec.label") }}
        controlProps={{ disabled, className: "w-full" }}
      />
    );
  }

  return (
    <DateTimeField
      fieldName="config.scheduled_at"
      fieldProps={{ label: t("form.config.run_at.label") }}
      controlProps={{
        disabled,
        required: true,
        timestampUnit: "seconds",
        className: "items-start",
      }}
    />
  );
}
