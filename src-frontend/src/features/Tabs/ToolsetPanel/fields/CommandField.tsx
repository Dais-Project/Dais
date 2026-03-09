import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type { ToolsetCreateFormValues } from "../form-types";

export function CommandField() {
  const { t } = useTranslation("tabs-toolset");
  const { register, getFieldState } = useFormContext<ToolsetCreateFormValues>();

  return (
    <FieldItem
      label={t("form.command.label")}
      fieldState={getFieldState("params.command")}
      align="start"
    >
      <Input {...register("params.command", { required: t("form.command.required") })} />
    </FieldItem>
  );
}
