import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { useController, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { i18n } from "@/i18n";
import { FORM_NAMESPACE } from "@/i18n/resources";
import type { FieldProps } from ".";

type SelectFieldProps<S extends Record<string, string>> = FieldProps<
  Omit<ComponentProps<typeof Select>, "value" | "onValueChange" | "name">,
  {
    placeholder?: string;
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
  placeholder = i18n.t("fields.type.placeholder", { ns: FORM_NAMESPACE }),
  fieldProps,
  controlProps,
}: SelectFieldProps<S>) {
  const { t } = useTranslation(FORM_NAMESPACE);
  const { control } = useFormContext<Record<string, string>>();
  const { label = t("fields.type.label"), ...restFieldProps } = fieldProps ?? {};
  const { required = true, ...restControlProps } = controlProps ?? {};
  const { field, fieldState } = useController({
    name: fieldName,
    control,
    rules: {
      required: required ? t("fields.type.validation.required") : false,
    },
  });

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      fieldState={fieldState}
    >
      <Select
        name={fieldName}
        value={field.value}
        onValueChange={field.onChange}
        required={required}
        {...restControlProps}
      >
        <SelectTrigger onBlur={field.onBlur}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children ??
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
