import { useThrottleFn } from "ahooks";
import { useCallback, useRef } from "react";

type UseTextBufferProps = {
  onAccumulated?: (messageId: string, allText: string) => void;
  throttleDelay?: number;
};

type UseTextBufferResult = {
  text: string;
  accumulate: (messageId: string, chunk: string) => void;
  clear: () => void;
};

export function useTextBuffer({
  onAccumulated,
  throttleDelay = 100,
}: UseTextBufferProps): UseTextBufferResult {
  const textRef = useRef<string>("");
  const { run: accumulateNotify, cancel: cancelThrottle } = useThrottleFn(
    (messageId: string) => onAccumulated?.(messageId, textRef.current),
    { wait: throttleDelay }
  );
  const accumulate = useCallback(
    (messageId: string, chunk: string) => {
      textRef.current += chunk;
      accumulateNotify(messageId);
    },
    [accumulateNotify]
  );
  const clear = useCallback(() => {
    textRef.current = "";
    cancelThrottle();
  }, [cancelThrottle]);

  return {
    text: textRef.current,
    accumulate,
    clear,
  };
}
