import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import isURL from "validator/lib/isURL";
import { FORM_NAMESPACE } from "@/i18n/resources";
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
  fieldProps,
  controlProps,
}: UrlFieldProps) {
  const { t } = useTranslation(FORM_NAMESPACE);
  const { register, getFieldState, formState } = useFormContext();
  const { label = t("fields.url.label"), ...restFieldProps } = fieldProps ?? {};
  const { placeholder = t("fields.url.placeholder"), ...restControlProps } =
    controlProps ?? {};

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      align="center"
      fieldState={getFieldState(fieldName, formState)}
    >
      <Input
        {...register(fieldName, {
          required: required ? t("fields.url.validation.required") : false,
          validate: (value) => {
            if (isURL(value, { protocols: ["http", "https"], require_protocol: true })) {
              return true;
            }
            return t("fields.url.validation.invalid_http_https");
          },
        })}
        type="url"
        placeholder={placeholder}
        {...restControlProps}
      />
    </FieldItem>
  );
}
