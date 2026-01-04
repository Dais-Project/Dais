import { DownloadIcon } from "lucide-react";
import { MultiSelectDialog } from "@/components/custom/dialog/MultiSelectDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ModelListHeaderProps = {
  existingModelNames: string[];
  availableModels: string[];
  isLoadingModels: boolean;
  onSelectModels: (selectedModels: string[]) => void;
};

export function ModelListHeader({
  existingModelNames,
  availableModels,
  isLoadingModels,
  onSelectModels,
}: ModelListHeaderProps) {
  return (
    <div className="flex justify-between">
      <Label>模型列表</Label>
      <MultiSelectDialog
        values={existingModelNames}
        selections={availableModels}
        onConfirm={onSelectModels}
        placeholder="搜索模型..."
        emptyText={isLoadingModels ? "加载中..." : "未找到模型"}
      >
        <Button type="button" variant="outline" size="sm">
          <DownloadIcon className="mr-1 h-4 w-4" />
          获取模型
        </Button>
      </MultiSelectDialog>
    </div>
  );
}
