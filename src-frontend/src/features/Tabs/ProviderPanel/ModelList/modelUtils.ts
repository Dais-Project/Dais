import type {
  LlmModelBase,
  LlmModelCreate,
  LlmModelUpdate,
} from "@/types/provider";

type LlmModel = LlmModelCreate | LlmModelUpdate;

/**
 * 合并选中的模型与现有模型列表
 * @param existingModels - 现有模型列表
 * @param selectedModelNames - 选中的模型名称
 * @returns 合并后的模型列表
 */
export function mergeModelsWithSelection(
  existingModels: LlmModel[],
  selectedModelNames: string[]
): LlmModel[] {
  const selectedSet = new Set(selectedModelNames);
  const result: LlmModel[] = [];

  // 保留已存在且被选中的模型
  for (const model of existingModels) {
    if (selectedSet.has(model.name)) {
      result.push(model);
      selectedSet.delete(model.name);
    }
  }

  // 为新选中的模型创建默认配置
  for (const modelName of selectedSet) {
    result.push(createDefaultModel(modelName));
  }

  return result;
}

/**
 * 创建默认模型配置
 */
export function createDefaultModel(name: string): LlmModelCreate {
  return {
    name,
    context_size: 128_000,
    capability: {
      vision: false,
      reasoning: false,
      tool_use: false,
    },
  };
}

/**
 * 更新指定索引的模型
 */
export function updateModelAtIndex(
  models: LlmModel[],
  index: number,
  updatedModel: LlmModelBase
): LlmModel[] {
  return models.map((model, i) => (i === index ? updatedModel : model));
}

/**
 * 删除指定索引的模型
 */
export function removeModelAtIndex(
  models: LlmModel[],
  index: number
): LlmModel[] {
  return models.filter((_, i) => i !== index);
}
