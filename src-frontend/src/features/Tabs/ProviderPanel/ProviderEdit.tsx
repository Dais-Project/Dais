import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type {
  LlmProviders,
  ProviderCreate,
  ProviderRead,
  ProviderUpdate,
} from "@/api/generated/schemas";
import {
  getGetProviderQueryKey,
  getGetProvidersQueryKey,
  useCreateProvider,
  useUpdateProvider,
} from "@/api/provider";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { PasswordInput } from "@/components/Password";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROVIDER_DEFAULT_URLS,
  PROVIDER_TYPE_LABELS,
} from "@/constants/provider";
import { ModelList } from "./ModelList";

const URL_REGEX = /^(https?:\/\/)([^\s/$.?#].[^\s]*)$/;

type ProviderEditProps = {
  provider: ProviderRead | ProviderCreate;
  onConfirm?: () => void;
};

export function ProviderEdit({ provider, onConfirm }: ProviderEditProps) {
  const isEditMode = "id" in provider;
  const queryClient = useQueryClient();

  const {
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting },
    control,
  } = useForm<ProviderCreate>();

  useEffect(() => {
    reset({
      name: provider.name,
      type: provider.type,
      base_url: provider.base_url,
      api_key: provider.api_key,
      models: [...provider.models],
    });
  }, [provider, reset]);

  const formValues = useWatch({ control });

  const createProviderMutation = useCreateProvider({
    mutation: {
      onSuccess: (newProvider) => {
        queryClient.invalidateQueries({ queryKey: getGetProvidersQueryKey() });
        toast.success("创建成功", {
          description: `已成功创建 ${newProvider.name} 服务提供商。`,
        });
        reset();
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("创建失败", {
          description:
            error.message || "创建 provider 时发生错误，请稍后重试。",
        });
      },
    },
  });

  const updateProviderMutation = useUpdateProvider({
    mutation: {
      onSuccess: (updatedProvider) => {
        queryClient.invalidateQueries({ queryKey: getGetProvidersQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetProviderQueryKey(updatedProvider.id),
        });
        toast.success("更新成功", {
          description: `已成功更新 ${updatedProvider.name} 服务提供商。`,
        });
        reset();
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("更新失败", {
          description:
            error.message || "更新 provider 时发生错误，请稍后重试。",
        });
      },
    },
  });

  const onSubmit = (data: ProviderCreate) => {
    if (isEditMode) {
      updateProviderMutation.mutate({
        providerId: provider.id,
        data: data as ProviderUpdate,
      });
    } else {
      createProviderMutation.mutate({
        data: data as ProviderCreate,
      });
    }
  };

  const handleTypeChange = (value: LlmProviders) => {
    if (!(value in PROVIDER_DEFAULT_URLS)) {
      return;
    }
    setValue("type", value);
    const shouldUpdateBaseUrl =
      formValues.base_url === undefined ||
      formValues.base_url === "" ||
      (formValues.type &&
        formValues.base_url === PROVIDER_DEFAULT_URLS[formValues.type]);
    const defaultUrl = PROVIDER_DEFAULT_URLS[value];
    if (shouldUpdateBaseUrl && defaultUrl) {
      setValue("base_url", defaultUrl);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="h-full py-4">
      <FieldGroup className="h-full gap-y-2">
        <Controller
          name="name"
          control={control}
          rules={{
            required: "请输入提供商名称",
            minLength: {
              value: 1,
              message: "名称不能为空",
            },
            maxLength: {
              value: 50,
              message: "名称长度不能超过 50 个字符",
            },
          }}
          render={({ field, fieldState }) => (
            <FieldItem title="名称" fieldState={fieldState}>
              <Input {...field} placeholder="提供商名称" />
            </FieldItem>
          )}
        />

        <Controller
          name="type"
          control={control}
          rules={{ required: "请选择提供商类型" }}
          render={({ field, fieldState }) => (
            <FieldItem title="类型" fieldState={fieldState}>
              <Select value={field.value} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择提供商类型" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_TYPE_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </FieldItem>
          )}
        />

        <Controller
          name="base_url"
          control={control}
          rules={{
            required: "请输入 API 基础地址",
            pattern: {
              value: URL_REGEX,
              message: "请输入有效的 HTTP 或 HTTPS URL",
            },
          }}
          render={({ field, fieldState }) => (
            <FieldItem title="API 基础地址" fieldState={fieldState}>
              <Input
                {...field}
                type="url"
                placeholder="https://api.example.com/v1"
              />
            </FieldItem>
          )}
        />

        <Controller
          name="api_key"
          control={control}
          rules={{
            required: "请输入 API 密钥",
            minLength: {
              value: 1,
              message: "API 密钥不能为空",
            },
          }}
          render={({ field, fieldState }) => (
            <FieldItem title="API 密钥" fieldState={fieldState}>
              <PasswordInput {...field} placeholder="输入 API 密钥" />
            </FieldItem>
          )}
        />

        <Controller
          name="models"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <ModelList
              models={field.value || []}
              onConfirm={field.onChange}
              provider={formValues as ProviderRead | ProviderCreate}
            />
          )}
        />

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {(() => {
              if (isEditMode) {
                return isSubmitting ? "保存中..." : "保存";
              }
              return isSubmitting ? "创建中..." : "创建";
            })()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
