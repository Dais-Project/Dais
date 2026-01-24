import { Controller, useFormContext } from "react-hook-form";
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
  placeholder,
  required = true,
  description,
  align = "center",
}: UrlFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={fieldName}
      control={control}
      rules={{
        required: required ? "请输入 URL" : false,
        validate: (value) => {
          if (isURL(value)) {
            return true;
          }
          return "请输入有效的 HTTP 或 HTTPS URL";
        },
      }}
      render={({ field, fieldState }) => (
        <FieldItem
          title={label}
          description={description}
          fieldState={fieldState}
          align={align}
        >
          <Input {...field} type="url" placeholder={placeholder} />
        </FieldItem>
      )}
    />
  );
}
