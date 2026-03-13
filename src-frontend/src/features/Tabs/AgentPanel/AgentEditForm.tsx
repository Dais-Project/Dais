import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TABS_AGENT_NAMESPACE } from "@/i18n/resources";
import { invalidateAgentQueries, useUpdateAgent } from "@/api/agent";
import type { AgentRead } from "@/api/generated/schemas";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, RichTextField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { AgentIconField } from "./fields/AgentIconField";
import { AgentModelField } from "./fields/AgentModelField";
import { ToolMultiSelectField } from "./fields/ToolMultiSelectField";
import { type AgentEditFormValues, agentToEditFormValues } from "./form-types";

type AgentEditFormProps = {
  agent: AgentRead;
  onConfirm?: () => void;
};

export function AgentEditForm({ agent, onConfirm }: AgentEditFormProps) {
  const { t } = useTranslation(TABS_AGENT_NAMESPACE);
  const formValues = useMemo(() => agentToEditFormValues(agent), [agent]);

  const updateMutation = useUpdateAgent({
    mutation: {
      async onSuccess(updatedAgent: { id: number; name: string }) {
        await invalidateAgentQueries(updatedAgent.id);
        toast.success(t("toast.update.success_title"), {
          description: t("toast.update.success_description_with_name", { name: updatedAgent.name }),
        });
        onConfirm?.();
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
        fieldProps={{ label: t("form.name.label") }}
        controlProps={{ placeholder: t("form.name.placeholder") }}
      />

      <AgentIconField />

      <AgentModelField />

      <RichTextField
        fieldName="instruction"
        fieldProps={{ label: t("form.instruction.label"), className: "mt-2" }}
        controlProps={{ className: "mt-2" }}
      />

      <ToolMultiSelectField />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? t("form.submit.saving") : t("form.submit.save")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
