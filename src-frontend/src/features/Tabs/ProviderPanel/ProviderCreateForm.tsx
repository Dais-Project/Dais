import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TABS_PROVIDER_NAMESPACE } from "@/i18n/resources";
import type { ProviderCreate } from "@/api/generated/schemas";
import { useCreateProvider, invalidateProviderQueries } from "@/api/provider";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, UrlField } from "@/components/custom/form/fields";
import { PasswordField } from "@/components/custom/form/fields/PasswordField";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROVIDER } from "@/constants/provider";
import { ModelsField } from "./fields/ModelsField";
import { ProviderTypeSelectField } from "./fields/ProviderTypeSelectField";
import type { ProviderCreateFormValues } from "./form-types";

type ProviderCreateFormProps = {
  onConfirm?: () => void;
};

export function ProviderCreateForm({ onConfirm }: ProviderCreateFormProps) {
  const { t } = useTranslation(TABS_PROVIDER_NAMESPACE);

  const createMutation = useCreateProvider({
    mutation: {
      async onSuccess(newProvider: { name: string }) {
        await invalidateProviderQueries();
        toast.success(t("toast.create.success_title"), {
          description: t("toast.create.success_description_with_name", { name: newProvider.name }),
        });
        onConfirm?.();
      },
    },
  });

  function handleSubmit(data: ProviderCreateFormValues) {
    const payload: ProviderCreate = {
      ...data,
      models: data.models,
    };

    createMutation.mutate({ data: payload });
  }

  return (
    <FormShell<ProviderCreateFormValues>
      values={DEFAULT_PROVIDER}
      onSubmit={handleSubmit}
    >
      <NameField fieldName="name" fieldProps={{ label: t("form.name.label") }} />

      <ProviderTypeSelectField />

      <UrlField
        fieldName="base_url"
        fieldProps={{ label: t("form.base_url.label") }}
        controlProps={{ placeholder: t("form.base_url.placeholder") }}
      />

      <PasswordField
        fieldName="api_key"
        fieldProps={{ label: t("form.api_key.label") }}
        controlProps={{ placeholder: t("form.api_key.placeholder") }}
      />

      <ModelsField />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
