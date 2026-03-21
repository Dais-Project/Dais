import { useTranslation } from "react-i18next";
import { useController, useFormContext } from "react-hook-form";
import { TABS_TOOLSET_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { ChipInput } from "@/components/ui/chip-input";

export function ArgsField() {
  const { t } = useTranslation(TABS_TOOLSET_NAMESPACE);
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: "params.args", control });

  return (
    <FieldItem
      label={t("form.args.label")}
      fieldState={fieldState}
      orientation="vertical"
      align="start"
    >
      <ChipInput {...field} />
    </FieldItem>
  );
}
