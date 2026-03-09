import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
import type { ToolsetType } from "@/api/generated/schemas";
import { SelectField } from "@/components/custom/form/fields";
import type { ToolsetCreateFormValues } from "../form-types";

export function ToolsetTypeSelectField() {
  const { t } = useTranslation("tabs-toolset");
  const { control } = useFormContext<ToolsetCreateFormValues>();
  const type = useWatch({
    control,
    name: "type",
  });

  const isBuiltIn = type === "built_in";
  const selections: Record<string, ToolsetType> = isBuiltIn
    ? { [t("form.type.option.built_in")]: "built_in" }
    : {
        [t("form.type.option.mcp_local")]: "mcp_local",
        [t("form.type.option.mcp_remote")]: "mcp_remote",
      };

  return (
    <SelectField
      fieldName="type"
      placeholder={t("form.type.placeholder")}
      selections={selections}
      fieldProps={{ label: t("form.type.label") }}
      controlProps={{ disabled: isBuiltIn }}
    />
  );
}
