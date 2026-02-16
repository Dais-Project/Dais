import { useFormContext } from "react-hook-form";
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
    selections?: S;
    children?: React.ReactNode;
    required?: boolean;
    errorMessage?: string;
  }
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
  const { register, getFieldState } = useFormContext();

  if (selections && children) {
    throw new Error("Cannot provide both selections and children");
  }
  if (!(selections || children)) {
    throw new Error("Must provide either selections or children");
  }

  return (
    <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
      <Select
        {...register(fieldName, { required: required ? errorMessage : false })}
        {...controlProps}
      >
        <SelectTrigger>
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
