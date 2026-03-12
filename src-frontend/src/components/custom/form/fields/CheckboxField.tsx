import { useTranslation } from "react-i18next";
import { useController, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Checkbox } from "@/components/ui/checkbox";
import type { FieldProps } from ".";

type CheckboxFieldProps = FieldProps<typeof Checkbox>;

export function CheckboxField({
  fieldName,
  fieldProps,
  controlProps,
}: CheckboxFieldProps) {
  const { t } = useTranslation("form");
  const { control, getFieldState } = useFormContext<Record<string, boolean>>();
  const { field } = useController({
    name: fieldName,
    control,
  });
  const { label = t("fields.enabled.label"), ...restFieldProps } = fieldProps ?? {};

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      fieldState={getFieldState(fieldName)}
    >
      <Checkbox
        checked={field.value}
        onCheckedChange={field.onChange}
        onBlur={field.onBlur}
        name={field.name}
        {...controlProps}
      />
    </FieldItem>
  );
}
