import { useController, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FieldItem } from "@/components/custom/item/FieldItem";
import { IntervalPicker } from "@/components/ui/interval-picker";
import { FORM_NAMESPACE } from "@/i18n/resources";

import type { FieldProps } from ".";
import { cn } from "@/lib/utils";

type IntervalPickerFieldProps = FieldProps<typeof IntervalPicker>;

export function IntervalPickerField({
  fieldName,
  fieldProps,
  controlProps,
}: IntervalPickerFieldProps) {
  const { t } = useTranslation(FORM_NAMESPACE);
  const { control, getFieldState, formState } = useFormContext<Record<string, number>>();
  const { field } = useController({
    name: fieldName,
    control,
  });
  const { label = t("fields.interval.label"), ...restFieldProps } = fieldProps ?? {};

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      fieldState={getFieldState(fieldName, formState)}
    >
      <IntervalPicker
        value={field.value}
        onChange={field.onChange}
        className={cn(controlProps?.className, "w-fit")}
        disabled={controlProps?.disabled}
      />
    </FieldItem>
  );
}
