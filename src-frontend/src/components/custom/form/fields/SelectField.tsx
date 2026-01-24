import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SelectFieldProps<S extends Record<string, string>> = {
  fieldName?: string;
  label?: string;
  placeholder?: string;
  selections: S;
  disabled?: boolean;
  required?: boolean;
  errorMessage?: string;
};

export function SelectField<S extends Record<string, string>>({
  fieldName = "type",
  label = "类型",
  placeholder = "请选择类型",
  selections,
  disabled = false,
  required = true,
  errorMessage = "请选择类型",
}: SelectFieldProps<S>) {
  const { control } = useFormContext();

  return (
    <Controller
      name={fieldName}
      control={control}
      rules={{ required: required ? errorMessage : false }}
      render={({ field, fieldState }) => (
        <FieldItem title={label} fieldState={fieldState}>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(selections).map(
                ([selectionLabel, selectionValue]) => (
                  <SelectItem
                    key={selectionValue as string}
                    value={selectionValue as string}
                  >
                    {selectionLabel}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </FieldItem>
      )}
    />
  );
}
