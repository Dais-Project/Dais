import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TABS_AGENT_NAMESPACE } from "@/i18n/resources";
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
  const { t } = useTranslation(TABS_AGENT_NAMESPACE);

  const createMutation = useCreateAgent({
    mutation: {
      async onSuccess(newAgent: { name: string }) {
        await invalidateAgentQueries();
        toast.success(t("toast.create.success_title"), {
          description: t("toast.create.success_description_with_name", { name: newAgent.name }),
        });
        onConfirm?.();
      },
    },
  });

  function handleSubmit(data: AgentCreateFormValues) {
    createMutation.mutate({ data });
  }

  return (
    <FormShell<AgentCreateFormValues> values={DEFAULT_AGENT} onSubmit={handleSubmit}>
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
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("form.submit.creating") : t("form.submit.create")}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
