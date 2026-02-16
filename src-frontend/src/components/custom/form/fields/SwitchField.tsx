import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Switch } from "@/components/ui/switch";
import type { FieldProps } from ".";

type SwitchFieldProps = FieldProps<typeof Switch>;

export function SwitchField({
  fieldName,
  fieldProps = { label: "启用" },
  controlProps,
}: SwitchFieldProps) {
  const { register, getFieldState } = useFormContext();

  return (
    <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
      <Switch {...register(fieldName, { value: false })} {...controlProps} />
    </FieldItem>
  );
}
