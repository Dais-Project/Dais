import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateTool } from "@/api/toolset";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ToolRead, ToolUpdate } from "@/types/toolset";

type ToolListProps = {
  toolsetId: number;
  tools: ToolRead[];
};

export function ToolList({ toolsetId, tools }: ToolListProps) {
  const queryClient = useQueryClient();

  const updateToolMutation = useMutation({
    mutationFn: ({ toolId, data }: { toolId: number; data: ToolUpdate }) =>
      updateTool(toolsetId, toolId, data),
    onSuccess: (updatedTool) => {
      queryClient.invalidateQueries({ queryKey: ["toolset", toolsetId] });
      toast.success("更新成功", {
        description: `已成功更新工具 ${updatedTool.name}。`,
      });
    },
    onError: (error: Error) => {
      toast.error("更新失败", {
        description: error.message || "更新工具时发生错误，请稍后重试。",
      });
    },
  });

  const handleToggle = (
    toolId: number,
    field: "is_enabled" | "auto_approve",
    value: boolean
  ) => {
    updateToolMutation.mutate({
      toolId,
      data: { [field]: value },
    });
  };

  if (tools.length === 0) {
    return null;
  }

  return (
    <FieldSet className="mt-6">
      <FieldLegend>工具列表</FieldLegend>
      <FieldGroup className="gap-y-3">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <div className="mb-3 font-medium">{tool.name}</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <Label>启用</Label>
                <Switch
                  checked={tool.is_enabled}
                  onCheckedChange={(value) =>
                    handleToggle(tool.id, "is_enabled", value)
                  }
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <Label>自动批准</Label>
                <Switch
                  checked={tool.auto_approve}
                  onCheckedChange={(value) =>
                    handleToggle(tool.id, "auto_approve", value)
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </FieldGroup>
    </FieldSet>
  );
}
