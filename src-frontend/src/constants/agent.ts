import type { AgentCreate } from "@/api/generated/schemas";

export const DEFAULT_AGENT = {
  name: "",
  icon_name: "bot",
  system_prompt: "",
  model_id: null,
} satisfies AgentCreate;
