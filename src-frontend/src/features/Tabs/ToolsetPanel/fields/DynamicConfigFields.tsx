import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
import { TABS_TOOLSET_NAMESPACE } from "@/i18n/resources";
import { UrlField } from "@/components/custom/form/fields";
import type { ToolsetCreateFormValues } from "../form-types";
import { ArgsField } from "./ArgsField";
import { CommandField } from "./CommandField";
import { HttpHeadersField } from "./HttpHeadersField";

export function DynamicConfigFields() {
  const { t } = useTranslation(TABS_TOOLSET_NAMESPACE);
  const { control } = useFormContext<ToolsetCreateFormValues>();
  const type = useWatch({ control, name: "type" });

  if (type === "mcp_local") {
    return (
      <>
        <CommandField />
        <ArgsField />
      </>
    );
  }

  if (type === "mcp_remote") {
    return (
      <>
        <UrlField
          fieldName="params.url"
          fieldProps={{ label: t("form.url.label"), align: "start" }}
          controlProps={{ placeholder: t("form.url.placeholder") }}
        />
        <HttpHeadersField />
      </>
    );
  }

  return null;
}
