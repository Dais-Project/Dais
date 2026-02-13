import { useCallback } from "react";
import type {
  LlmModelCreate,
  ProviderCreate,
  ProviderRead,
} from "@/api/generated/schemas";
import { useFetchModels } from "@/api/llm";
import {
  mergeModelsWithSelection,
  removeModelAtIndex,
  updateModelAtIndex,
} from "./modelUtils";

type UseModelManagementProps = {
  models: LlmModelCreate[];
  provider: ProviderRead | ProviderCreate;
  onModelsChange: (models: LlmModelCreate[]) => void;
};

type UseModelManagementResult = {
  availableModels: string[];
  isLoadingModels: boolean;
  existingModelNames: string[];
  handleSelectModels: (selectedModelNames: string[]) => void;
  handleDeleteModel: (index: number) => void;
  handleEditModel: (index: number, updatedModel: LlmModelCreate) => void;
};

export function useModelManagement({
  models,
  provider,
  onModelsChange,
}: UseModelManagementProps): UseModelManagementResult {
  const { data: availableModels, isLoading } = useFetchModels(
    {
      base_url: provider.base_url,
      api_key: provider.api_key,
      type: provider.type,
    },
    {
      query: {
        enabled: Boolean(
          provider.type && provider.base_url && provider.api_key
        ),
      },
    }
  );

  const handleSelectModels = useCallback(
    (selectedModelNames: string[]) => {
      const mergedModels = mergeModelsWithSelection(models, selectedModelNames);
      onModelsChange(mergedModels);
    },
    [models, onModelsChange]
  );

  const handleDeleteModel = useCallback(
    (index: number) => {
      const updatedModels = removeModelAtIndex(models, index);
      onModelsChange(updatedModels);
    },
    [models, onModelsChange]
  );

  const handleEditModel = useCallback(
    (index: number, updatedModel: LlmModelCreate) => {
      const updatedModels = updateModelAtIndex(models, index, updatedModel);
      onModelsChange(updatedModels);
    },
    [models, onModelsChange]
  );

  return {
    availableModels: (availableModels ?? []) as string[],
    isLoadingModels: isLoading,
    existingModelNames: models.map((m) => m.name),
    handleSelectModels,
    handleDeleteModel,
    handleEditModel,
  };
}
