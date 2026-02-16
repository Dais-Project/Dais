import { useFormContext, useWatch } from "react-hook-form";
import { UrlField } from "@/components/custom/form/fields";
import type { ToolsetCreateFormValues } from "../form-types";
import { ArgsField } from "./ArgsField";
import { CommandField } from "./CommandField";
import { HttpHeadersField } from "./HttpHeadersField";

export function DynamicConfigFields() {
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
          fieldProps={{ label: "URL", align: "start" }}
          controlProps={{ placeholder: "https://api.example.com" }}
        />
        <HttpHeadersField />
      </>
    );
  }

  return null;
}
