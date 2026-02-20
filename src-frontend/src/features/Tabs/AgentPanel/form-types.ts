import type { AgentCreate, AgentRead } from "@/api/generated/schemas";

export type AgentCreateFormValues = AgentCreate;

export type AgentEditFormValues = AgentCreate;

export function agentToEditFormValues(agent: AgentRead): AgentEditFormValues {
  return {
    name: agent.name,
    icon_name: agent.icon_name,
    system_prompt: agent.system_prompt,
    model_id: agent.model?.id ?? null,
  };
}
