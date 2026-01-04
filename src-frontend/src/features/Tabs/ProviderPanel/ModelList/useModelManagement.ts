import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { fetchProviderModels } from "@/api/llm";
import type {
  LlmModelBase,
  LlmModelCreate,
  LlmModelUpdate,
  ProviderCreate,
  ProviderRead,
} from "@/types/provider";
import {
  mergeModelsWithSelection,
  removeModelAtIndex,
  updateModelAtIndex,
} from "./modelUtils";

type LlmModel = LlmModelCreate | LlmModelUpdate;

type UseModelManagementProps = {
  models: LlmModel[];
  provider: ProviderRead | ProviderCreate;
  onModelsChange: (models: LlmModel[]) => void;
};

export function useModelManagement({
  models,
  provider,
  onModelsChange,
}: UseModelManagementProps) {
  // 获取可用模型列表
  const { data: availableModels, isLoading } = useQuery({
    queryKey: [
      "provider-models",
      provider.name,
      provider.base_url,
      provider.api_key,
    ],
    queryFn: () =>
      fetchProviderModels(provider.type, provider.base_url, provider.api_key),
    enabled: Boolean(provider.type && provider.base_url && provider.api_key),
  });

  // 处理模型选择
  const handleSelectModels = useCallback(
    (selectedModelNames: string[]) => {
      const mergedModels = mergeModelsWithSelection(models, selectedModelNames);
      onModelsChange(mergedModels);
    },
    [models, onModelsChange]
  );

  // 处理模型删除
  const handleDeleteModel = useCallback(
    (index: number) => {
      const updatedModels = removeModelAtIndex(models, index);
      onModelsChange(updatedModels);
    },
    [models, onModelsChange]
  );

  // 处理模型编辑
  const handleEditModel = useCallback(
    (index: number, updatedModel: LlmModelBase) => {
      const updatedModels = updateModelAtIndex(models, index, updatedModel);
      onModelsChange(updatedModels);
    },
    [models, onModelsChange]
  );

  return {
    availableModels: availableModels ?? [],
    isLoadingModels: isLoading,
    existingModelNames: models.map((m) => m.name),
    handleSelectModels,
    handleDeleteModel,
    handleEditModel,
  };
}
