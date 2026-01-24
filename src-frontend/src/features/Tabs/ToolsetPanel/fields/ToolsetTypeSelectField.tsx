import { useFormContext, useWatch } from "react-hook-form";
import { SelectField } from "@/components/custom/form/fields";
import type { ToolsetType } from "@/types/toolset";
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
      label="类型"
      placeholder="选择 Toolset 类型"
      selections={selections}
      disabled={isBuiltIn}
    />
  );
}
