import { useCallback, useMemo, useRef } from "react";
import { useUnmount } from "ahooks";
import { wakeLock } from "@/lib/wake-lock";

export function useWakeLock() {
  const wakeLockHandle = useRef<ReturnType<
    typeof wakeLock.acquireScoped
  > | null>(null);

  const acquire = useCallback(() => {
    if (!wakeLockHandle.current) {
      wakeLockHandle.current = wakeLock.acquireScoped();
    }
  }, []);

  const release = useCallback(() => {
    if (!wakeLockHandle.current) {
      return;
    }
    wakeLockHandle.current.then((handle) => handle?.release());
    wakeLockHandle.current = null;
  }, []);

  useUnmount(release);

  return useMemo(
    () => ({
      acquire,
      release,
    }),
    [acquire, release],
  );
}
