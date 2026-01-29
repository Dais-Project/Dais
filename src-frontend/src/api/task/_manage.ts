import type { TaskCreate, TaskRead } from "@/types/task";
import { API_BASE, fetchApi, type PaginatedResponse } from "../index";

export async function fetchTasks(
  workspaceId: number,
  page = 1,
  perPage = 15
): Promise<PaginatedResponse<TaskRead>> {
  const params = new URLSearchParams({
    workspace_id: workspaceId.toString(),
    page: page.toString(),
    per_page: perPage.toString(),
  });

  return await fetchApi<PaginatedResponse<TaskRead>>(
    `${API_BASE}/tasks?${params}`
  );
}

export async function fetchTaskById(taskId: number): Promise<TaskRead> {
  return await fetchApi<TaskRead>(`${API_BASE}/tasks/${taskId}`);
}

export async function createTask(taskData: TaskCreate): Promise<TaskRead> {
  return await fetchApi<TaskRead>(`${API_BASE}/tasks/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskData),
  });
}

export async function deleteTask(taskId: number): Promise<void> {
  await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
}
