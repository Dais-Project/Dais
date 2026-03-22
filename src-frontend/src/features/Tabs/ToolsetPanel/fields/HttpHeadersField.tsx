import { useTranslation } from "react-i18next";
import { useController, useFormContext } from "react-hook-form";
import { TABS_TOOLSET_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { KeyValueEditor, makePair } from "@/components/ui/key-value-editor";

export function HttpHeadersField() {
  const { t } = useTranslation(TABS_TOOLSET_NAMESPACE);
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: "params.http_headers", control });

  return (
    <FieldItem
      label={t("form.http_headers.label")}
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
