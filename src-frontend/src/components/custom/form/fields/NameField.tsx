import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { FORM_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type { FieldProps } from ".";

export function NameField({
  fieldName = "name",
  fieldProps,
  controlProps,
}: FieldProps<typeof Input>) {
  const { t } = useTranslation(FORM_NAMESPACE);
  const { register, getFieldState, formState } = useFormContext();
  const { label = t("fields.name.label"), ...restFieldProps } = fieldProps ?? {};
  const { placeholder = t("fields.name.placeholder"), ...restControlProps } =
    controlProps ?? {};

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      fieldState={getFieldState(fieldName, formState)}
    >
      <Input
        {...register(fieldName, {
          required: t("fields.name.validation.required"),
          minLength: {
            value: 1,
            message: t("fields.name.validation.empty"),
          },
          maxLength: {
            value: 50,
            message: t("fields.name.validation.max_length"),
          },
        })}
        placeholder={placeholder}
        className="w-full min-w-0"
        {...restControlProps}
      />
    </FieldItem>
  );
}
