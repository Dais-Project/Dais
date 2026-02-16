import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProviderCreate } from "@/api/generated/schemas";
import { getGetProvidersQueryKey, useCreateProvider } from "@/api/provider";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, UrlField } from "@/components/custom/form/fields";
import { PasswordField } from "@/components/custom/form/fields/PasswordField";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROVIDER } from "@/constants/provider";
import { ModelListField } from "./fields/ModelListField";
import { ProviderTypeSelectField } from "./fields/ProviderTypeSelectField";
import type { ProviderCreateFormValues } from "./form-types";

type ProviderCreateFormProps = {
  onConfirm?: () => void;
};

export function ProviderCreateForm({ onConfirm }: ProviderCreateFormProps) {
  const queryClient = useQueryClient();

  const createMutation = useCreateProvider({
    mutation: {
      onSuccess: (newProvider) => {
        queryClient.invalidateQueries({ queryKey: getGetProvidersQueryKey() });
        toast.success("创建成功", {
          description: `已成功创建 ${newProvider.name} 服务提供商。`,
        });
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("创建失败", {
          description:
            error.message || "创建服务提供商时发生错误，请稍后重试。",
        });
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
      <NameField fieldName="name" label="名称" />

      <ProviderTypeSelectField />

      <UrlField
        fieldName="base_url"
        label="Base URL"
        placeholder="请输入服务地址"
      />

      <PasswordField
        fieldName="api_key"
        label="API Key"
        placeholder="请输入 API Key"
      />

      <ModelListField fieldName="models" />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "创建中..." : "创建"}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
