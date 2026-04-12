import { useCallback, useMemo, useState } from "react";
import type { TaskFlags } from ".";

export function useTaskFlags() {
  const [flags, setFlags] = useState<TaskFlags>({ isSuccess: false, requiresUserAction: false });
  const reset = useCallback(() => {
    setFlags(() => ({ isSuccess: false, requiresUserAction: false }));
  }, [setFlags]);
  const setFlag = useCallback((newFlags: Partial<TaskFlags>) => {
    setFlags((prev) => ({...prev, ...newFlags}));
  }, [setFlags]);

  return useMemo(() => ({
    flags,
    setFlag,
    reset,
  }), [flags, setFlag, reset]);
}
