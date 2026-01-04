import type {
  LlmModelCreate,
  LlmModelUpdate,
  ProviderCreate,
  ProviderRead,
} from "@/types/provider";
import { ModelItem } from "./ModelItem";
import { ModelListHeader } from "./ModelListHeader";
import { useModelManagement } from "./useModelManagement";

type LlmModel = LlmModelCreate | LlmModelUpdate;

type ModelListProps = {
  models: LlmModel[];
  onConfirm: (models: LlmModel[]) => void;
  provider: ProviderRead | ProviderCreate;
};

export function ModelList({ models, onConfirm, provider }: ModelListProps) {
  const {
    availableModels,
    isLoadingModels,
    existingModelNames,
    handleSelectModels,
    handleDeleteModel,
    handleEditModel,
  } = useModelManagement({
    models,
    provider,
    onModelsChange: onConfirm,
  });

  return (
    <div className="flex flex-col gap-3">
      <ModelListHeader
        existingModelNames={existingModelNames}
        availableModels={availableModels}
        isLoadingModels={isLoadingModels}
        onSelectModels={handleSelectModels}
      />
      <div className="space-y-2">
        {models.map((model, index) => (
          <ModelItem
            key={model.name}
            model={model}
            index={index}
            onDelete={handleDeleteModel}
            onEdit={handleEditModel}
          />
        ))}
      </div>
    </div>
  );
}
