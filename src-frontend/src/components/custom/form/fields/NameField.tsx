import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type { FieldProps } from ".";

export function NameField({
  fieldName = "name",
  fieldProps,
  controlProps,
}: FieldProps<typeof Input>) {
  const { t } = useTranslation("form");
  const { register, getFieldState } = useFormContext();
  const { label = t("form.name.label"), ...restFieldProps } = fieldProps ?? {};
  const { placeholder = t("fields.name.placeholder"), ...restControlProps } =
    controlProps ?? {};

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      fieldState={getFieldState(fieldName)}
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
