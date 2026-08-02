import {
  type LlmModelCapability,
  type LlmModelCreate,
  LlmProviders,
  type ProviderCreate,
} from "@/api/generated/schemas";

export type ReasoningEffort = NonNullable<LlmModelCapability["reasoning_effort"]>;

export const PROVIDER_TYPE_LABELS: Partial<Record<LlmProviders, string>> = {
  [LlmProviders.openai]: "OpenAI",
  [LlmProviders.openai_responses]: "OpenAI Responses",
  [LlmProviders.anthropic]: "Anthropic",
  // [LlmProviders.gemini]: "Gemini",
};

export const PROVIDER_DEFAULT_URLS: Partial<Record<LlmProviders, string>> = {
  [LlmProviders.openai]: "https://api.openai.com/v1",
  [LlmProviders.openai_responses]: "https://api.openai.com/v1",
  [LlmProviders.anthropic]: "https://api.anthropic.com/v1",
  // [LlmProviders.gemini]: "https://generativelanguage.googleapis.com/v1beta",
};

const OPENAI_REASONING_EFFORTS: readonly ReasoningEffort[] = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

const ANTHROPIC_REASONING_EFFORTS: readonly ReasoningEffort[] = ["low", "medium", "high", "xhigh", "max"];

export const PROVIDER_REASONING_EFFORTS: Partial<Record<LlmProviders, readonly ReasoningEffort[]>> = {
  [LlmProviders.openai]: OPENAI_REASONING_EFFORTS,
  [LlmProviders.openai_responses]: OPENAI_REASONING_EFFORTS,
  [LlmProviders.anthropic]: ANTHROPIC_REASONING_EFFORTS,
};

export const DEFAULT_PROVIDER = {
  name: "",
  type: LlmProviders.openai,
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
