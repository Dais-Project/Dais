import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
import { DateTimeField, IntervalPickerField } from "@/components/custom/form/fields";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import type {
  ScheduleCreateFormValues,
  ScheduleEditFormValues,
} from "../form-types";
import { CronFields } from "./CronFields";

type ScheduleFormValues = ScheduleCreateFormValues | ScheduleEditFormValues;

type DynamicConfigFieldsProps = {
  disabled: boolean;
};

export function DynamicConfigFields({ disabled }: DynamicConfigFieldsProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { control } = useFormContext<ScheduleFormValues>();
  const type = useWatch({ control, name: "config.type" });

  switch (type) {
    case "cron": {
      return <CronFields disabled={disabled} />;
    }
    case "polling": {
      return (
        <IntervalPickerField
          fieldName="config.interval_sec"
          fieldProps={{ label: t("form.config.interval_sec.label") }}
          controlProps={{ disabled, className: "w-full" }}
        />
      );
    }
    case "delayed":
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
    default:
      console.error("Unexpected config type: " + type);
      return null;
  }
}
