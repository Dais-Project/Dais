import { useFormContext } from "react-hook-form";
import isURL from "validator/lib/isURL";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";

type UrlFieldProps = {
  fieldName?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  align?: "start" | "center" | "end";
};

export function UrlField({
  fieldName = "url",
  label = "URL",
  placeholder = "请输入 URL",
  required = true,
  description,
  align = "center",
}: UrlFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const fieldState = {
    error: errors[fieldName],
    invalid: !!errors[fieldName],
  };

  return (
    <FieldItem
      title={label}
      description={description}
      fieldState={fieldState}
      align={align}
    >
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
        placeholder={placeholder}
      />
    </FieldItem>
  );
}
