import { useDebounceFn } from "ahooks";
import { useCallback, useRef } from "react";
import { sendNotification, type NotificationOptions } from "@/lib/notification";

type UseNotificationBufferProps = {
  multipleTitle: string;
  options?: NotificationOptions;
  debounceDelay?: number;
};

export type NotificationBufferHook = {
  enqueue: (title: string) => void;
  flush: () => void;
  clear: () => void;
};

export function useNotificationBuffer({
  multipleTitle,
  options,
  debounceDelay = 300,
}: UseNotificationBufferProps): NotificationBufferHook {
  const bufferRef = useRef<string[]>([]);

  const flush = useCallback(() => {
    const buffer = bufferRef.current;
    if (buffer.length === 0) {
      return;
    }
    const title = buffer.length === 1 ? buffer[0] : multipleTitle;
    bufferRef.current = [];
    sendNotification(title, options);
  }, [multipleTitle, options]);

  const { run: scheduleFlush, cancel: cancelDebounce } = useDebounceFn(flush, {
    wait: debounceDelay,
  });

  const enqueue = useCallback(
    (title: string) => {
      bufferRef.current.push(title);
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const clear = useCallback(() => {
    bufferRef.current = [];
    cancelDebounce();
  }, [cancelDebounce]);

  return {
    enqueue,
    flush,
    clear,
  };
}
