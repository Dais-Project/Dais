import {
  type LlmModelCreate,
  LlmProviders,
  type ProviderCreate,
} from "@/api/generated/schemas";

export const PROVIDER_TYPE_LABELS: Partial<Record<LlmProviders, string>> = {
  [LlmProviders.openai]: "OpenAI",
  [LlmProviders.anthropic]: "Anthropic",
  [LlmProviders.gemini]: "Gemini",
};

export const PROVIDER_DEFAULT_URLS: Partial<Record<LlmProviders, string>> = {
  [LlmProviders.openai]: "https://api.openai.com/v1",
  [LlmProviders.anthropic]: "https://api.anthropic.com/v1",
  [LlmProviders.gemini]: "https://generativelanguage.googleapis.com/v1beta",
};

export const DEFAULT_PROVIDER = {
  name: "",
  type: "openai",
  base_url: "",
  api_key: "sk-",
  models: [],
} satisfies ProviderCreate;

export const DEFAULT_LLM_MODEL = {
  name: "",
  context_size: 128_000,
  capability: {
    vision: false,
    reasoning: false,
    tool_use: false,
  },
} satisfies LlmModelCreate;
