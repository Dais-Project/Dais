import type {
  LlmModelCreate,
  LlmModelRead,
  ProviderBrief,
} from "@/api/generated/schemas";

type ProviderBaseFormValue = Omit<ProviderBrief, "id">;
export type ProviderCreateFormValue = ProviderBaseFormValue & {
  models: LlmModelCreate[];
};
export type ProviderEditFormValue = ProviderBaseFormValue & {
  models: (LlmModelCreate | LlmModelRead)[];
};
