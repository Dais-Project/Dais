import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Switch } from "@/components/ui/switch";

type SwitchFieldProps = {
  fieldName: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function SwitchField({
  fieldName,
  label,
  description,
  disabled = false,
}: SwitchFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldState = { error: errors[fieldName], invalid: !!errors[fieldName] };

  return (
    <FieldItem title={label} description={description} fieldState={fieldState}>
      <Switch {...register(fieldName, { value: false })} disabled={disabled} />
    </FieldItem>
  );
}
