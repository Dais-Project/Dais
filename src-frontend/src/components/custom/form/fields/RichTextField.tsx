import { useTranslation } from "react-i18next";
import {
  type RegisterOptions,
  useController,
  useFormContext,
} from "react-hook-form";
import { useMount, useTheme } from "ahooks";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Vditor } from "@/components/custom/Vditor";
import { i18n } from "@/i18n";
import { FORM_NAMESPACE } from "@/i18n/resources";
import { useSettingsStore } from "@/stores/settings-store";
import type { FieldProps } from ".";
import { VDITOR_LOCALE_MAP } from "@/i18n/locale-maps/vditor";

function createRichTextRules(
  label: string,
  required: boolean,
  minLength: number,
  maxLength: number | undefined
) {
  const t = (...args: Parameters<typeof i18n.t>) => i18n.t(...args);
  const rules: RegisterOptions = {};
  if (required) {
    rules.required = t("fields.rich_text.validation.required_with_label", { label, ns: FORM_NAMESPACE });
  }
  if (minLength !== undefined) {
    rules.minLength = {
      value: minLength,
      message: t("fields.rich_text.validation.min_length_with_label", {
        label,
        minLength,
        ns: FORM_NAMESPACE
      }),
    };
  }
  if (maxLength !== undefined) {
    rules.maxLength = {
      value: maxLength,
      message: t("fields.rich_text.validation.max_length_with_label", {
        label,
        maxLength,
        ns: FORM_NAMESPACE
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
  const { label = t("fields.rich_text.label"), ...restFieldProps } = fieldProps ?? {};

  const { field } = useController({
    name: fieldName,
    control,
    rules: createRichTextRules(label as string, required, minLength, maxLength),
  });

  const { theme: themeMode, language } = useSettingsStore((state) => state.current);
  const { theme, setThemeMode } = useTheme();
  useMount(() => setThemeMode(themeMode));

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
        theme={theme}
        lang={VDITOR_LOCALE_MAP[language]}
        {...controlProps}
      />
    </FieldItem>
  );
}
