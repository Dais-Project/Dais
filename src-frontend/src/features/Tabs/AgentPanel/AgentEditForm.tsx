import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  getGetAgentQueryKey,
  getGetAgentsQueryKey,
  useUpdateAgent,
} from "@/api/agent";
import type { AgentRead } from "@/api/generated/schemas";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, RichTextField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { AgentIconField } from "./fields/AgentIconField";
import { AgentModelField } from "./fields/AgentModelField";
import { type AgentEditFormValues, agentToEditFormValues } from "./form-types";

type AgentEditFormProps = {
  agent: AgentRead;
  onConfirm?: () => void;
};

export function AgentEditForm({ agent, onConfirm }: AgentEditFormProps) {
  const queryClient = useQueryClient();

  const formValues = useMemo(() => agentToEditFormValues(agent), [agent]);

  const updateMutation = useUpdateAgent({
    mutation: {
      onSuccess: (updatedAgent) => {
        queryClient.invalidateQueries({ queryKey: getGetAgentsQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetAgentQueryKey(updatedAgent.id),
        });
        toast.success("更新成功", {
          description: `已成功更新 ${updatedAgent.name} Agent。`,
        });
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("更新失败", {
          description: error.message || "更新 Agent 时发生错误，请稍后重试。",
        });
      },
    },
  });

  function handleSubmit(data: AgentEditFormValues) {
    updateMutation.mutate({ agentId: agent.id, data });
  }

  return (
    <FormShell<AgentEditFormValues> values={formValues} onSubmit={handleSubmit}>
      <NameField
        fieldName="name"
        fieldProps={{ label: "名称" }}
        controlProps={{ placeholder: "请输入 Agent 名称" }}
      />

      <AgentIconField />

      <AgentModelField initialModel={agent.model} />

      <RichTextField
        fieldName="system_prompt"
        maxLength={10_000}
        fieldProps={{ label: "Agent 提示词", className: "mt-2" }}
        controlProps={{
          className: "mx-1 mt-2",
          editorClassName: "min-h-[8em]",
        }}
      />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
