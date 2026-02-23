import { toast } from "sonner";
import { invalidateAgentQueries, useCreateAgent } from "@/api/agent";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, RichTextField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DEFAULT_AGENT } from "@/constants/agent";
import { AgentIconField } from "./fields/AgentIconField";
import { AgentModelField } from "./fields/AgentModelField";
import { ToolMultiSelectField } from "./fields/ToolMultiSelectField";
import type { AgentCreateFormValues } from "./form-types";

type AgentCreateFormProps = {
  onConfirm?: () => void;
};

export function AgentCreateForm({ onConfirm }: AgentCreateFormProps) {

  const createMutation = useCreateAgent({
    mutation: {
      async onSuccess(newAgent) {
        await invalidateAgentQueries();
        toast.success("创建成功", {
          description: `已成功创建 ${newAgent.name} Agent。`,
        });
        onConfirm?.();
      },
      onError(error: Error) {
        toast.error("创建失败", {
          description: error.message || "创建 Agent 时发生错误，请稍后重试。",
        });
      },
    },
  });

  function handleSubmit(data: AgentCreateFormValues) {
    createMutation.mutate({ data });
  }

  return (
    <FormShell<AgentCreateFormValues> values={DEFAULT_AGENT} onSubmit={handleSubmit}>
      <NameField fieldName="name" fieldProps={{ label: "名称" }} controlProps={{ placeholder: "请输入 Agent 名称" }} />

      <AgentIconField />

      <AgentModelField />

      <RichTextField
        fieldName="system_prompt"
        maxLength={10_000}
        fieldProps={{ label: "Agent 提示词", className: "mt-2" }}
        controlProps={{
          className: "mx-1 mt-2",
          editorClassName: "min-h-[8em]",
        }}
      />

      <ToolMultiSelectField />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "创建中..." : "创建"}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
