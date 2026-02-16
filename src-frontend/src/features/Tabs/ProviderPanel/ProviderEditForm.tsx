import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProviderRead } from "@/api/generated/schemas";
import {
  getGetProviderQueryKey,
  getGetProvidersQueryKey,
  useUpdateProvider,
} from "@/api/provider";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, UrlField } from "@/components/custom/form/fields";
import { PasswordField } from "@/components/custom/form/fields/PasswordField";
import { Button } from "@/components/ui/button";
import { ModelsField } from "./fields/ModelsField";
import { ProviderTypeSelectField } from "./fields/ProviderTypeSelectField";
import type { ProviderEditFormValue } from "./form-types";

type ProviderEditFormProps = {
  provider: ProviderRead;
  onConfirm?: () => void;
};

export function ProviderEditForm({
  provider,
  onConfirm,
}: ProviderEditFormProps) {
  const queryClient = useQueryClient();
  const formValues: ProviderEditFormValue = provider;

  const updateMutation = useUpdateProvider({
    mutation: {
      onSuccess: (updatedProvider) => {
        queryClient.invalidateQueries({ queryKey: getGetProvidersQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetProviderQueryKey(updatedProvider.id),
        });
        toast.success("更新成功", {
          description: `已成功更新 ${updatedProvider.name} 服务提供商。`,
        });
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("更新失败", {
          description:
            error.message || "更新服务提供商时发生错误，请稍后重试。",
        });
      },
    },
  });

  return (
    <FormShell<ProviderEditFormValue>
      values={formValues}
      onSubmit={(data: ProviderEditFormValue) => {
        updateMutation.mutate({ providerId: provider.id, data });
      }}
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

      <ModelsField />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
