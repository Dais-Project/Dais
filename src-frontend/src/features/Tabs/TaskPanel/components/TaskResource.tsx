import type { ReactNode } from "react";
import { API_BASE } from "@/api";
import type { TaskType } from "@/api/generated/schemas";
import { useTaskResourceAccessUrlSuspense } from "@/api/tasks";

type TaskResourceProps = {
  taskType: TaskType;
  taskId: number;
  resourceId: number;
  children: (resourceUrl: string) => ReactNode;
};

export function TaskResource({
  taskType,
  taskId,
  resourceId,
  children,
}: TaskResourceProps) {
  const { data } = useTaskResourceAccessUrlSuspense({
    task_type: taskType,
    task_id: taskId,
    resource_id: resourceId,
  });
  const resourceUrl = new URL(data.url, API_BASE).toString();
  return children(resourceUrl);
}
