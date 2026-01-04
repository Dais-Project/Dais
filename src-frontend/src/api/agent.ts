import type {
  AgentBrief,
  AgentCreate,
  AgentRead,
  AgentUpdate,
} from "@/types/agent";
import { API_BASE, fetchApi, type PaginatedResponse } from "./index";

export async function fetchAgents(
  page = 1,
  perPage = 15
): Promise<PaginatedResponse<AgentRead>> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  return await fetchApi<PaginatedResponse<AgentRead>>(
    `${API_BASE}/agents/?${params}`
  );
}

export async function fetchAgentsBrief(): Promise<AgentBrief[]> {
  return await fetchApi<AgentBrief[]>(`${API_BASE}/agents/brief`);
}

export async function fetchAgentById(id: number): Promise<AgentRead> {
  return await fetchApi<AgentRead>(`${API_BASE}/agents/${id}`);
}

export async function createAgent(agentData: AgentCreate): Promise<AgentRead> {
  return await fetchApi<AgentRead>(`${API_BASE}/agents/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(agentData),
  });
}

export async function updateAgent(
  agentId: number,
  agentData: AgentUpdate
): Promise<AgentRead> {
  return await fetchApi<AgentRead>(`${API_BASE}/agents/${agentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(agentData),
  });
}

export async function deleteAgent(agentId: number): Promise<void> {
  await fetchApi(`${API_BASE}/agents/${agentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
}
