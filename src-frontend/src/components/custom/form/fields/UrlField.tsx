import { useFormContext } from "react-hook-form";
import isURL from "validator/lib/isURL";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type { FieldProps } from ".";

type UrlFieldProps = FieldProps<
  typeof Input,
  {
    required?: boolean;
  }
>;

export function UrlField({
  fieldName = "url",
  required = true,
  fieldProps = { label: "URL", align: "center" },
  controlProps = { placeholder: "请输入 URL" },
}: UrlFieldProps) {
  const { register, getFieldState } = useFormContext();

  return (
    <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
      <Input
        {...register(fieldName, {
          required: required ? "请输入 URL" : false,
          validate: (value) => {
            if (isURL(value)) {
              return true;
            }
            return "请输入有效的 HTTP 或 HTTPS URL";
          },
        })}
        type="url"
        {...controlProps}
      />
    </FieldItem>
  );
}
