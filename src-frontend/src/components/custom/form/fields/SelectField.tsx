import { useController, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldProps } from ".";

type SelectFieldProps<S extends Record<string, string>> = FieldProps<
  typeof Select,
  {
    placeholder?: string;
    required?: boolean;
    errorMessage?: string;
  } & MustOneOf<{
    selections: S;
    children: React.ReactNode;
  }>
>;

export { SelectItem };

export function SelectField<S extends Record<string, string>>({
  selections,
  children,
  fieldName = "type",
  placeholder = "请选择类型",
  required = true,
  errorMessage = "请选择类型",
  fieldProps = { label: "类型" },
  controlProps,
}: SelectFieldProps<S>) {
  const { control } = useFormContext<Record<string, string>>();
  const { field, fieldState } = useController({
    name: fieldName,
    control,
    rules: {
      required: required ? errorMessage : false,
    },
  });

  const {
    onValueChange: onValueChangeFromProps,
    value: _ignoredValue,
    defaultValue: _ignoredDefaultValue,
    name: _ignoredName,
    required: requiredFromProps,
    ...restControlProps
  } = controlProps ?? {};

  return (
    <FieldItem {...fieldProps} fieldState={fieldState}>
      <Select
        {...restControlProps}
        value={typeof field.value === "string" ? field.value : undefined}
        onValueChange={(value) => {
          field.onChange(value);
          onValueChangeFromProps?.(value);
        }}
        name={field.name}
        required={requiredFromProps ?? required}
      >
        <SelectTrigger onBlur={field.onBlur}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children ??
            // biome-ignore lint/style/noNonNullAssertion: selections is guaranteed to be defined if we reach this line
            Object.entries(selections!).map(
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
  );
}
