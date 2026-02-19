import { useController, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Switch } from "@/components/ui/switch";
import type { FieldProps } from ".";

type SwitchFieldProps = FieldProps<typeof Switch>;

export function SwitchField({ fieldName, fieldProps = { label: "启用" }, controlProps }: SwitchFieldProps) {
  const { control, getFieldState } = useFormContext<Record<string, boolean>>();
  const { field } = useController({
    name: fieldName,
    control,
  });

  return (
    <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
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
