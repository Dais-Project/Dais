import { useTranslation } from "react-i18next";
import { useController, useFormContext } from "react-hook-form";
import { FORM_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Switch } from "@/components/ui/switch";
import type { FieldProps } from ".";

type SwitchFieldProps = FieldProps<typeof Switch>;

export function SwitchField({ fieldName, fieldProps, controlProps }: SwitchFieldProps) {
  const { t } = useTranslation(FORM_NAMESPACE);
  const { control, getFieldState, formState } = useFormContext<Record<string, boolean>>();
  const { field } = useController({
    name: fieldName,
    control,
  });
  const { label = t("fields.enabled.label"), ...restFieldProps } = fieldProps ?? {};

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      fieldState={getFieldState(fieldName, formState)}
    >
      <Switch
        checked={field.value}
        onCheckedChange={field.onChange}
        onBlur={field.onBlur}
        name={field.name}
        disabled={controlProps?.disabled}
        required={controlProps?.required}
        {...controlProps}
      />
    </FieldItem>
  );
}
