import { useTranslation } from "react-i18next";
import { useController, useFormContext } from "react-hook-form";
import { TABS_TOOLSET_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { KeyValueEditor, makePair } from "@/components/ui/key-value-editor";
import type { ToolsetCreateFormValues, ToolsetEditFormValues } from "../form-types";

export function EnvField() {
  const { t } = useTranslation(TABS_TOOLSET_NAMESPACE);
  const { control } = useFormContext<ToolsetCreateFormValues | ToolsetEditFormValues>();
  const { field, fieldState } = useController({ name: "params.env", control });

  return (
    <FieldItem
      label={t("form.env.label")}
      fieldState={fieldState}
      orientation="vertical"
      align="start"
    >
      <KeyValueEditor
        className="w-full"
        value={field.value ?? [makePair()]}
        onChange={(pairs) => field.onChange(pairs)}
      />
    </FieldItem>
  );
}
