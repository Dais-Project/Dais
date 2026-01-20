import type {
  ToolRead,
  ToolsetBrief,
  ToolsetCreate,
  ToolsetRead,
  ToolsetUpdate,
  ToolUpdate,
} from "@/types/toolset";
import { API_BASE, fetchApi } from "./index";

export async function fetchToolsetsBrief(): Promise<ToolsetBrief[]> {
  return await fetchApi<ToolsetBrief[]>(`${API_BASE}/toolsets/brief`);
}

export async function fetchToolsetById(id: number): Promise<ToolsetRead> {
  return await fetchApi<ToolsetRead>(`${API_BASE}/toolsets/${id}`);
}

export async function createToolset(
  toolsetData: ToolsetCreate
): Promise<ToolsetRead> {
  return await fetchApi<ToolsetRead>(`${API_BASE}/toolsets/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toolsetData),
  });
}

export async function updateToolset(
  toolsetId: number,
  toolsetData: ToolsetUpdate
): Promise<ToolsetRead> {
  return await fetchApi<ToolsetRead>(`${API_BASE}/toolsets/${toolsetId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toolsetData),
  });
}

export async function updateTool(
  toolsetId: number,
  toolId: number,
  toolData: ToolUpdate
): Promise<ToolRead> {
  return await fetchApi<ToolRead>(
    `${API_BASE}/toolsets/${toolsetId}/tools/${toolId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toolData),
    }
  );
}

export async function deleteToolset(toolsetId: number): Promise<void> {
  await fetchApi(`${API_BASE}/toolsets/${toolsetId}`, {
    method: "DELETE",
  });
}
