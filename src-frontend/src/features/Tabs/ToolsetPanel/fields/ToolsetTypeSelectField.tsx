import { useFormContext, useWatch } from "react-hook-form";
import type { ToolsetType } from "@/api/generated/schemas";
import { SelectField } from "@/components/custom/form/fields";
import type { ToolsetCreateFormValues } from "../form-types";

export function ToolsetTypeSelectField() {
  const { control } = useFormContext<ToolsetCreateFormValues>();
  const type = useWatch({
    control,
    name: "type",
  });

  const isBuiltIn = type === "built_in";
  const selections: Record<string, ToolsetType> = isBuiltIn
    ? { "Built-in": "built_in" }
    : {
        "Local MCP": "mcp_local",
        "Remote MCP": "mcp_remote",
      };

  return (
    <SelectField
      fieldName="type"
      placeholder="选择 Toolset 类型"
      selections={selections}
      fieldProps={{ label: "类型" }}
      controlProps={{ disabled: isBuiltIn, value: type }}
    />
  );
}
