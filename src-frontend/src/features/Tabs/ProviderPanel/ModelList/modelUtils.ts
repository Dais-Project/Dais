import type { LlmModelCreate } from "@/api/generated/schemas";

export function mergeModelsWithSelection(
  existingModels: LlmModelCreate[],
  selectedModelNames: string[]
): LlmModelCreate[] {
  const defaultModel = (name: string) => ({
    name,
    context_size: 128_000,
    capability: {
      vision: false,
      reasoning: false,
      tool_use: false,
    },
  });

  const selectedSet = new Set(selectedModelNames);
  const result: LlmModelCreate[] = [];

  for (const model of existingModels) {
    if (selectedSet.has(model.name)) {
      result.push(model);
      selectedSet.delete(model.name);
    }
  }
  return result.concat(
    Array.from(selectedSet).map((modelName) => defaultModel(modelName))
  );
}

export function updateModelAtIndex(
  models: LlmModelCreate[],
  index: number,
  updatedModel: LlmModelCreate
): LlmModelCreate[] {
  return models.map((model, i) => (i === index ? updatedModel : model));
}

export function removeModelAtIndex(
  models: LlmModelCreate[],
  index: number
): LlmModelCreate[] {
  return models.filter((_, i) => i !== index);
}
