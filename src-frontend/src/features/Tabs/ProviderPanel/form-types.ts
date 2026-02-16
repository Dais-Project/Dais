import type {
  LlmModelCreate,
  LlmModelRead,
  ProviderBrief,
} from "@/api/generated/schemas";

type ProviderBaseFormValue = Omit<ProviderBrief, "id">;
export type ProviderCreateFormValues = ProviderBaseFormValue & {
  models: LlmModelCreate[];
};
export type ProviderEditFormValues = ProviderBaseFormValue & {
  models: (LlmModelCreate | LlmModelRead)[];
};
