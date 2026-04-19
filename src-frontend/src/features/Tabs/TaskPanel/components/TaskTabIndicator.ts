import { useEffect, useMemo, useRef } from "react";
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

type TaskTabIndicatorProps = {
  tabId: string;
  isActive: boolean;
};

export function TaskTabIndicator({ tabId, isActive }: TaskTabIndicatorProps) {
  const { state, flags } = useAgentTaskState();
  const setIndicator = useTabsStore((store) => store.setIndicator);
  const resolvedIndicator = useMemo(() => resolveTaskIndicator(state, flags), [state, flags]);
  const prevResolvedRef = useRef<TabIndicator>(resolvedIndicator);

  useEffect(() => {
    if (isActive) {
      setIndicator(tabId, null);
    } else {
      if (resolvedIndicator !== prevResolvedRef.current) {
        setIndicator(tabId, resolvedIndicator);
      }
    }
    prevResolvedRef.current = resolvedIndicator;
  }, [isActive, resolvedIndicator, tabId, setIndicator]);

  return null;
}
