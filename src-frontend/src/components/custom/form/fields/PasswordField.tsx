import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { PasswordInput } from "@/components/custom/PasswordInput";
import type { FieldProps } from ".";

type PasswordFieldProps = FieldProps<typeof PasswordInput>;

export function PasswordField({
  fieldName = "password",
  fieldProps,
  controlProps,
}: PasswordFieldProps) {
  const { t } = useTranslation("form");
  const { register, getFieldState } = useFormContext();
  const { label = t("form.password.label"), ...restFieldProps } = fieldProps ?? {};
  const { placeholder = t("fields.password.placeholder"), ...restControlProps } =
    controlProps ?? {};

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      fieldState={getFieldState(fieldName)}
    >
      <PasswordInput
        {...register(fieldName, {
          required: t("fields.password.validation.required"),
          minLength: {
            value: 1,
            message: t("fields.password.validation.empty"),
          },
        })}
        placeholder={placeholder}
        {...restControlProps}
      />
    </FieldItem>
  );
}
