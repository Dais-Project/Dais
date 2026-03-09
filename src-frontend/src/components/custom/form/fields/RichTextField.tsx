import { useTranslation } from "react-i18next";
import {
  type RegisterOptions,
  useController,
  useFormContext,
} from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Vditor } from "@/components/custom/Vditor";
import type { FieldProps } from ".";

function createRichTextRules(
  t: (key: string, options?: Record<string, string | number>) => string,
  label: string,
  required: boolean,
  minLength: number,
  maxLength: number | undefined
) {
  const rules: RegisterOptions = {};
  if (required) {
    rules.required = t("fields.rich_text.validation.required_with_label", { label });
  }
  if (minLength !== undefined) {
    rules.minLength = {
      value: minLength,
      message: t("fields.rich_text.validation.min_length_with_label", {
        label,
        minLength,
      }),
    };
  }
  if (maxLength !== undefined) {
    rules.maxLength = {
      value: maxLength,
      message: t("fields.rich_text.validation.max_length_with_label", {
        label,
        maxLength,
      }),
    };
  }
  return rules;
}

type RichTextFieldProps = FieldProps<
  Omit<React.ComponentProps<typeof Vditor>, "initialValue" | "onChange">,
  {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  }
>;

export function RichTextField({
  fieldName,
  required = false,
  minLength = 1,
  maxLength,
  controlProps,
  fieldProps,
}: RichTextFieldProps) {
  const { t } = useTranslation("form");
  const { control, getFieldState } = useFormContext();
  const { label = t("form.rich_text.label"), ...restFieldProps } = fieldProps ?? {};

  const { field } = useController({
    name: fieldName,
    control,
    rules: createRichTextRules(t, label as string, required, minLength, maxLength),
  });

  return (
    <FieldItem
      label={label}
      fieldState={getFieldState(fieldName)}
      orientation="vertical"
      {...restFieldProps}
    >
      <Vditor
        initialValue={field.value}
        onChange={field.onChange}
        {...controlProps}
      />
    </FieldItem>
  );
}
