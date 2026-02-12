import type { AgentRead } from "@/api/generated/schemas";

export type WorkspaceBase = {
  name: string;
  directory: string;
  workspace_background: string;
};

export type WorkspaceRead = WorkspaceBase & {
  id: number;
  usable_agents: AgentRead[];
};

export type WorkspaceCreate = WorkspaceBase & {
  usable_agent_ids: number[];
};

export type WorkspaceUpdate = Partial<
  WorkspaceBase & {
    usable_agent_ids: number[];
  }
>;
