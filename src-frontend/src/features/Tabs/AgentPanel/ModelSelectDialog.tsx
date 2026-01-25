import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { fetchProviders } from "@/api/provider";
import { GroupedSingleSelectDialog } from "@/components/custom/dialog/SingleSelectDialog";
import { Button } from "@/components/ui/button";
import type { LlmModelRead } from "@/types/provider";

type ModelSelectDialogProps = {
  selectedModel: LlmModelRead | null;
  onSelect: (modelId: LlmModelRead) => void;
};

export function ModelSelectDialog({
  selectedModel,
  onSelect,
}: ModelSelectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    data: providers,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
    enabled: isOpen,
  });

  const groups = useMemo(() => {
    if (!providers) {
      return [];
    }
    return providers.map((provider) => ({
      heading: provider.name,
      items: provider.models,
    }));
  }, [providers]);

  const emptyText = (() => {
    if (isError) {
      return "无法加载供应商和模型列表，请稍后重试。";
    }
    if (!providers || providers.length === 0) {
      return "暂无供应商，请先添加 LLM 供应商以使用模型。";
    }
    return "未找到模型";
  })();

  return (
    <GroupedSingleSelectDialog
      value={selectedModel ?? undefined}
      groups={groups}
      getLabel={(model) => model.name}
      getValue={(model) => model.id.toString()}
      onSelect={(model) => onSelect(model)}
      onOpenChange={(open) => setIsOpen(open)}
      placeholder="搜索模型..."
      emptyText={emptyText}
    >
      <Button variant="outline" disabled={isLoading}>
        {isLoading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
        {selectedModel ? selectedModel.name : "选择模型"}
      </Button>
    </GroupedSingleSelectDialog>
  );
}
