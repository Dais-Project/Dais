import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";

export function ArgsField() {
  const { t } = useTranslation("tabs-toolset");
  const { register, getFieldState } = useFormContext();

  return (
    <FieldItem
      label={t("form.args.label")}
      description={t("form.args.description")}
      fieldState={getFieldState("params.args")}
      orientation="vertical"
      align="start"
    >
      <Textarea
        {...register("params.args")}
        placeholder={t("form.args.placeholder")}
        rows={4}
      />
    </FieldItem>
  );
}
