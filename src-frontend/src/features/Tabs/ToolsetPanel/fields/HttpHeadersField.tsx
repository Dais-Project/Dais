import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";

export function HttpHeadersField() {
  const { t } = useTranslation("tabs-toolset");
  const { register, getFieldState } = useFormContext();

  return (
    <FieldItem
      label={t("form.http_headers.label")}
      description={t("form.http_headers.description")}
      fieldState={getFieldState("params.http_headers")}
      orientation="vertical"
      align="start"
    >
      <Textarea
        {...register("params.http_headers", {
          validate: (value) => {
            if (!value || value.trim() === "") {
              return true;
            }
            try {
              JSON.parse(value);
              return true;
            } catch {
              return t("form.http_headers.invalid_json");
            }
          },
        })}
        placeholder='{"Authorization": "Bearer token"}'
        rows={6}
      />
    </FieldItem>
  );
}
