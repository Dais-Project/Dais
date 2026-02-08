import { useThrottleFn } from "ahooks";
import { useCallback, useRef } from "react";

type UseTextBufferProps = {
  onAccumulated?: (allText: string) => void;
  throttleDelay?: number;
};

export type TextBuffer = {
  text: string;
  accumulate: (chunk: string) => void;
  clear: () => void;
};

export function useTextBuffer({
  onAccumulated,
  throttleDelay = 100,
}: UseTextBufferProps): TextBuffer {
  const textRef = useRef<string>("");
  const { run: accumulateNotify, cancel: cancelThrottle } = useThrottleFn(
    () => onAccumulated?.(textRef.current),
    { wait: throttleDelay }
  );
  const accumulate = useCallback(
    (chunk: string) => {
      textRef.current += chunk;
      accumulateNotify();
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
