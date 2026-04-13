import { useEffect } from "react";
import { usePrevious } from "ahooks";
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
  const isPrevActive = usePrevious(isActive);
  const currentIndicator = useTabsStore((store) => store.indicators[tabId] ?? null);
  const setIndicator = useTabsStore((store) => store.setIndicator);

  useEffect(() => {
    const indicator = resolveTaskIndicator(state, flags);
    setIndicator(tabId, indicator);
  }, [state, flags, tabId, setIndicator]);

  useEffect(() => {
    if (isPrevActive === false && isActive === true) {
      if (currentIndicator && currentIndicator !== "in-progress") {
        setIndicator(tabId, null);
      }
    }
  }, [isPrevActive, isActive, tabId, currentIndicator, setIndicator]);

  return null;
}
