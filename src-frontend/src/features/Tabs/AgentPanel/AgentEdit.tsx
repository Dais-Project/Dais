import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  getGetAgentQueryKey,
  getGetAgentsQueryKey,
  useCreateAgent,
  useUpdateAgent,
} from "@/api/agent";
import type {
  AgentCreate,
  AgentRead,
  LlmModelRead,
} from "@/api/generated/schemas";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap";
import { DEFAULT_AGENT } from "@/constants/agent";
import { ModelSelectDialog } from "@/features/Tabs/AgentPanel/ModelSelectDialog";
import { type IconName, IconSelectDialog } from "./IconSelectDialog";

type AgentEditProps = {
  agent: AgentRead | AgentCreate;
  onConfirm?: () => void;
};

type FormValues = AgentCreate;

export function AgentEdit({ agent, onConfirm }: AgentEditProps) {
  const isEditMode = "id" in agent;
  const initialModelId =
    (isEditMode ? agent.model?.id : agent.model_id) ?? null;

  const queryClient = useQueryClient();

  const { handleSubmit, control, reset } = useForm<FormValues>({
    // TODO: remove this
    defaultValues: DEFAULT_AGENT,
  });

  const [selectedModel, setSelectedModel] = useState<LlmModelRead | null>(
    isEditMode ? agent.model : null
  );

  const createAgentMutation = useCreateAgent({
    mutation: {
      onSuccess: (newAgent) => {
        queryClient.invalidateQueries({ queryKey: getGetAgentsQueryKey() });
        toast.success("创建成功", {
          description: `已成功创建 ${newAgent.name} Agent。`,
        });
        reset();
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("创建失败", {
          description: error.message || "创建 Agent 时发生错误，请稍后重试。",
        });
      },
    },
  });

  const updateAgentMutation = useUpdateAgent({
    mutation: {
      onSuccess: (updatedAgent) => {
        queryClient.invalidateQueries({ queryKey: getGetAgentsQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetAgentQueryKey(updatedAgent.id),
        });
        toast.success("更新成功", {
          description: `已成功更新 ${updatedAgent.name} Agent。`,
        });
        reset();
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("更新失败", {
          description: error.message || "更新 Agent 时发生错误，请稍后重试。",
        });
      },
    },
  });

  const isPending =
    createAgentMutation.isPending || updateAgentMutation.isPending;

  useEffect(() => {
    reset({
      name: agent.name,
      icon_name: agent.icon_name,
      system_prompt: agent.system_prompt,
      model_id: initialModelId,
    });
  }, [agent, reset, initialModelId]);

  const onSubmit = (data: FormValues) => {
    if (isEditMode && "id" in agent) {
      updateAgentMutation.mutate({ agentId: agent.id, data });
    } else {
      createAgentMutation.mutate({ data });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="py-4">
      <FieldGroup className="gap-2">
        <Controller
          name="name"
          control={control}
          rules={{
            required: "名称为必填项",
            minLength: { value: 1, message: "名称不能为空" },
            maxLength: { value: 100, message: "名称最多100字符" },
          }}
          render={({ field, fieldState }) => (
            <FieldItem title="名称" fieldState={fieldState}>
              <Input {...field} placeholder="请输入 Agent 名称" />
            </FieldItem>
          )}
        />

        <Controller
          name="icon_name"
          control={control}
          render={({ field, fieldState }) => (
            <FieldItem title="图标" fieldState={fieldState}>
              <IconSelectDialog
                value={field.value as IconName}
                onChange={field.onChange}
              />
            </FieldItem>
          )}
        />

        <Controller
          name="model_id"
          control={control}
          render={({ field, fieldState }) => (
            <FieldItem title="关联模型" fieldState={fieldState}>
              <ModelSelectDialog
                selectedModel={selectedModel}
                onSelect={(model) => {
                  field.onChange(model.id);
                  setSelectedModel(model);
                }}
              />
            </FieldItem>
          )}
        />

        <Controller
          name="system_prompt"
          control={control}
          rules={{
            required: "系统提示为必填项",
            minLength: { value: 1, message: "系统提示不能为空" },
            maxLength: { value: 1000, message: "系统提示最多1000字符" },
          }}
          render={({ field, fieldState }) => (
            <FieldItem
              title="Agent 提示词"
              fieldState={fieldState}
              className="mt-2"
              orientation="vertical"
            >
              <MinimalTiptapEditor
                {...field}
                className="mx-1 mt-2"
                editorClassName="min-h-[8em]"
              />
            </FieldItem>
          )}
        />

        <div className="mt-6 flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
