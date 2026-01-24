import { Controller, useFormContext } from "react-hook-form";
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
  const { control } = useFormContext();

  return (
    <Controller
      name={fieldName}
      control={control}
      render={({ field, fieldState }) => (
        <FieldItem
          title={label}
          description={description}
          fieldState={fieldState}
        >
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
        </FieldItem>
      )}
    />
  );
}
