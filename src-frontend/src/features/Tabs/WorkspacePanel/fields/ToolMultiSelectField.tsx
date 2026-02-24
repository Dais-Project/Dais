import { useMemo } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useGetToolsetsSuspense } from "@/api/toolset";
import { ToolBreadcrumb } from "@/components/ai-elements/tool";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import type { WorkspaceCreateFormValues, WorkspaceEditFormValues } from "../form-types";
import { ToolMultiSelectDialog } from "../../../../components/custom/dialog/resource-dialog/ToolMultiSelectDialog";

function ToolSelectedList({ selectedToolIds }: { selectedToolIds: number[] }) {
  type ToolNamePair = {
    name: string;
    toolsetName: string;
  };

  const { data: toolsets } = useGetToolsetsSuspense();

  const toolMap = useMemo(() => {
    const map = new Map<number, ToolNamePair>();
    for (const toolset of toolsets) {
      for (const tool of toolset.tools) {
        map.set(tool.id, {
          toolsetName: toolset.name,
          name: tool.name,
        });
      }
    }
    return map;
  }, [toolsets]);

  const selectedTools = useMemo(() => {
    const tools: ToolNamePair[] = [];
    for (const id of selectedToolIds) {
      const tool = toolMap.get(id);
      if (!tool) {
        continue;
      }
      tools.push(tool);
    }
    return tools;
  }, [selectedToolIds, toolMap]);

  return (
    <div className="mt-2 space-y-2">
      {selectedTools.map((tool, index) => (
        <Item key={tool.toolsetName + index} variant="outline" size="sm">
          <ItemContent>
            <ItemTitle>
              <ToolBreadcrumb toolsetName={tool.toolsetName} toolName={tool.name} />
            </ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </div>
  );
}

export function ToolMultiSelectField() {
  const { control } =
    useFormContext<WorkspaceCreateFormValues | WorkspaceEditFormValues>();
  const {
    field: { value, onChange },
    fieldState,
  } = useController({
    name: "usable_tool_ids",
    control,
  });

  const selectedToolIds = value ?? [];

  return (
    <div>
      <FieldItem label="可用的工具" fieldState={fieldState}>
        <ToolMultiSelectDialog value={selectedToolIds} onChange={onChange} />
      </FieldItem>

      <AsyncBoundary errorDescription="无法加载工具列表，请稍后重试。">
        <ToolSelectedList selectedToolIds={selectedToolIds} />
      </AsyncBoundary>
    </div>
  );
}
