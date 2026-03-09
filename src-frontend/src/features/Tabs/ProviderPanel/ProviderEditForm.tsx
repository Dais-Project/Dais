import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ProviderRead } from "@/api/generated/schemas";
import { useUpdateProvider, invalidateProviderQueries } from "@/api/provider";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, UrlField } from "@/components/custom/form/fields";
import { PasswordField } from "@/components/custom/form/fields/PasswordField";
import { Button } from "@/components/ui/button";
import { ModelsField } from "./fields/ModelsField";
import { ProviderTypeSelectField } from "./fields/ProviderTypeSelectField";
import type { ProviderEditFormValues } from "./form-types";

type ProviderEditFormProps = {
  provider: ProviderRead;
  onConfirm?: () => void;
};

export function ProviderEditForm({
  provider,
  onConfirm,
}: ProviderEditFormProps) {
  const { t } = useTranslation("tabs-provider");
  const formValues: ProviderEditFormValues = provider;

  const updateMutation = useUpdateProvider({
    mutation: {
      async onSuccess(updatedProvider: { id: number; name: string }) {
        await invalidateProviderQueries(updatedProvider.id);
        toast.success(t("toast.update.success_title"), {
          description: t("toast.update.success_description_with_name", { name: updatedProvider.name }),
        });
        onConfirm?.();
      },
      onError(error: Error) {
        toast.error(t("toast.update.error_title"), {
          description: error.message || t("toast.update.error_description"),
        });
      },
    },
  });

  return (
    <FormShell<ProviderEditFormValues>
      values={formValues}
      onSubmit={(data: ProviderEditFormValues) => {
        updateMutation.mutate({ providerId: provider.id, data });
      }}
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
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? t("form.submit.saving") : t("form.submit.save")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
