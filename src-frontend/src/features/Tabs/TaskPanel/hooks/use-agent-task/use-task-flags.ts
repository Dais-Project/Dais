import { useCallback, useMemo, useState } from "react";
import type { TaskFlags } from ".";

const INITIAL_FLAGS: TaskFlags = {
  isFinished: false,
  requiresUserResponse: false,
  requiresUserPermission: false,
};

export function useTaskFlags() {
  const [flags, setFlags] = useState<TaskFlags>(INITIAL_FLAGS);
  const reset = useCallback(() => setFlags(INITIAL_FLAGS), [setFlags]);
  const setFlag = useCallback((newFlags: Partial<TaskFlags>) => {
    setFlags((prev) => ({...prev, ...newFlags}));
  }, [setFlags]);

  return useMemo(() => ({
    flags,
    setFlag,
    reset,
  }), [flags, setFlag, reset]);
}
