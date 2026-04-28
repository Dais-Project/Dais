import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
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
      <FieldItem
        label={t("form.config.interval_sec.label")}
        fieldState={getFieldState("config.interval_sec", formState)}
      >
        <Input
          type="number"
          {...register("config.interval_sec", {
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
      fieldState={getFieldState("config.scheduled_at", formState)}
    >
      <Input
        type="number"
        {...register("config.scheduled_at", {
          required: t("form.config.run_at.required"),
          valueAsNumber: true,
        })}
        disabled={disabled}
        placeholder={t("form.config.run_at.placeholder")}
      />
    </FieldItem>
  );
}
