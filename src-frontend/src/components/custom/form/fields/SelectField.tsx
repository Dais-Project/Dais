import { useFormContext } from "react-hook-form";
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
  selections?: S;
  children?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  errorMessage?: string;
};

export { SelectItem };

export function SelectField<S extends Record<string, string>>({
  selections,
  children,
  fieldName = "type",
  label = "类型",
  placeholder = "请选择类型",
  disabled = false,
  required = true,
  errorMessage = "请选择类型",
}: SelectFieldProps<S>) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldState = { error: errors[fieldName], invalid: !!errors[fieldName] };

  if (selections && children) {
    throw new Error("Cannot provide both selections and children");
  }
  if (!(selections || children)) {
    throw new Error("Must provide either selections or children");
  }

  return (
    <FieldItem title={label} fieldState={fieldState}>
      <Select
        {...register(fieldName, { required: required ? errorMessage : false })}
        disabled={disabled}
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
