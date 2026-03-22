import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { TABS_TOOLSET_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type { ToolsetCreateFormValues } from "../form-types";

export function CommandField() {
  const { t } = useTranslation(TABS_TOOLSET_NAMESPACE);
  const { register, getFieldState, formState } = useFormContext<ToolsetCreateFormValues>();

  return (
    <FieldItem
      label={t("form.command.label")}
      fieldState={getFieldState("params.command", formState)}
      align="start"
    >
      <Input {...register("params.command", { required: t("form.command.required") })} />
    </FieldItem>
  );
}
