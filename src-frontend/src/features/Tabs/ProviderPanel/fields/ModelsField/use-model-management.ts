import { type Control, useFieldArray } from "react-hook-form";
import type { LlmModelCreate, LlmModelRead } from "@/api/generated/schemas";
import { DEFAULT_LLM_MODEL } from "@/constants/provider";
import type {
  ProviderCreateFormValues,
  ProviderEditFormValues,
} from "../../form-types";

type ProviderFormValue = ProviderCreateFormValues | ProviderEditFormValues;
type ProviderModel = ProviderFormValue["models"][number];

function buildDefaultModel(name: string): ProviderModel {
  return {
    ...DEFAULT_LLM_MODEL,
    name,
  } as ProviderModel;
}

type UseModelManagementParams = {
  control: Control<ProviderFormValue>;
};

type UseModelManagementResult = {
  models: ProviderModel[];
  handleSelectModels: (selectedModelNames: string[]) => void;
  handleDeleteModel: (index: number) => void;
  handleEditModel: (updatedModel: LlmModelCreate | LlmModelRead) => void;
};

export function useModelManagement({
  control,
}: UseModelManagementParams): UseModelManagementResult {
  const {
    fields,
    replace,
    remove,
    update,
  } = useFieldArray({
    control,
    name: "models",
    keyName: "fieldId",
  });

  const models = fields as unknown as ProviderModel[];

  const handleSelectModels = (selectedModelNames: string[]) => {
    const existingModelsByName = new Map<string, ProviderModel>(
      models.map((model) => [model.name, model])
    );
    const nextModels = selectedModelNames.map(
      (name) => existingModelsByName.get(name) ?? buildDefaultModel(name)
    );
    replace(nextModels);
  };

  const handleDeleteModel = (index: number) => remove(index);

  const handleEditModel = (updatedModel: LlmModelCreate | LlmModelRead) => {
    const index = models.findIndex((model) => model.name === updatedModel.name);
    if (index === -1) {
      return false;
    }
    update(index, updatedModel);
    return true;
  };

  return {
    models,
    handleSelectModels,
    handleDeleteModel,
    handleEditModel,
  };
}
