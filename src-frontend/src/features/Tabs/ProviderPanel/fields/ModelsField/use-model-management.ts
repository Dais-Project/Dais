import {
  type Control,
  type FieldArrayWithId,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import type { LlmModelCreate } from "@/api/generated/schemas";
import { DEFAULT_LLM_MODEL } from "@/constants/provider";
import type {
  ProviderCreateFormValue,
  ProviderEditFormValue,
} from "../../form-types";

type ProviderFormValue = ProviderCreateFormValue | ProviderEditFormValue;
type ProviderModel = ProviderFormValue["models"][number];

const buildDefaultModel = (name: string): ProviderModel => {
  return {
    ...DEFAULT_LLM_MODEL,
    name,
  } as ProviderModel;
};

const hasNameConflict = (
  models: ProviderModel[],
  targetName: string,
  excludeIndex: number
) => {
  return models.some((model, index) => {
    if (index === excludeIndex) {
      return false;
    }
    return model.name === targetName;
  });
};

type UseModelManagementParams = {
  control: Control<ProviderFormValue>;
};

type UseModelManagementResult = {
  models: FieldArrayWithId<ProviderFormValue, "models", "id">[];
  handleSelectModels: (selectedModelNames: string[]) => void;
  handleDeleteModel: (index: number) => void;
  handleEditModel: (index: number, updatedModel: LlmModelCreate) => void;
};

export function useModelManagement({
  control,
}: UseModelManagementParams): UseModelManagementResult {
  const {
    fields: models,
    replace,
    remove,
    update,
  } = useFieldArray({
    control,
    name: "models",
  });

  const modelValues = useWatch({ control, name: "models" });
  const handleSelectModels = (selectedModelNames: string[]) => {
    const existingModelsByName = new Map<string, ProviderModel>(
      modelValues.map((model) => [model.name, model])
    );
    const nextModels = selectedModelNames.map(
      (name) => existingModelsByName.get(name) ?? buildDefaultModel(name)
    );
    replace(nextModels);
  };

  const handleDeleteModel = (index: number) => {
    remove(index);
  };

  const handleEditModel = (index: number, updatedModel: LlmModelCreate) => {
    const currentModel = modelValues[index];
    if (!currentModel) {
      return false;
    }
    if (!updatedModel.name) {
      toast.error("模型名称不能为空");
      return false;
    }
    if (hasNameConflict(modelValues, updatedModel.name, index)) {
      toast.error(`模型 "${updatedModel.name}" 已存在`);
      return false;
    }
    update(index, {
      ...currentModel,
      ...updatedModel,
    } as ProviderModel);
    return true;
  };

  return {
    models,
    handleSelectModels,
    handleDeleteModel,
    handleEditModel,
  };
}
