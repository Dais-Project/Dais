import { useController, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Checkbox } from "@/components/ui/checkbox";
import type { FieldProps } from ".";

type CheckboxFieldProps = FieldProps<typeof Checkbox>;

export function CheckboxField({ fieldName, fieldProps = { label: "启用" }, controlProps }: CheckboxFieldProps) {
  const { control, getFieldState } = useFormContext<Record<string, boolean>>();
  const { field } = useController({
    name: fieldName,
    control,
  });

  return (
    <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
      <Checkbox
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
