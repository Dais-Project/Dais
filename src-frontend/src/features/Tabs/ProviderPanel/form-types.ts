import type {
  LlmModelCreate,
  LlmModelRead,
  ProviderRead,
} from "@/api/generated/schemas";

type ProviderBaseFormValue = Omit<ProviderRead, "id">;
export type ProviderCreateFormValues = ProviderBaseFormValue & {
  models: LlmModelCreate[];
};
export type ProviderEditFormValues = ProviderBaseFormValue & {
  models: (LlmModelCreate | LlmModelRead)[];
};
