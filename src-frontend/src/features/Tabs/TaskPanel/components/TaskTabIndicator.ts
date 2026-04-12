import { useEffect } from "react";
import { type TabIndicator, useTabsStore } from "@/stores/tabs-store";
import { type TaskFlags, type TaskState, useAgentTaskState } from "../hooks/use-agent-task";

function resolveTaskIndicator(state: TaskState, flags: TaskFlags): TabIndicator | null {
  switch (state) {
    case "running": return "in-progress";
    case "error": return "destructive";
  }
  if (flags.isSuccess) {
    return "success";
  }
  if (flags.requiresUserAction) {
    return "warning";
  }
  return null;
}

export function TaskTabIndicator({tabId}: { tabId: string }) {
  const { state, flags } = useAgentTaskState();
  const setIndicator = useTabsStore((store) => store.setIndicator);

  useEffect(() => {
    const indicator = resolveTaskIndicator(state, flags);
    setIndicator(tabId, indicator);
  }, [setIndicator, state, flags, tabId]);

  return null;
}
