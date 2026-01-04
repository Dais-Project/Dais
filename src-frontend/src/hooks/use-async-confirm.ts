import { useCallback, useEffect, useRef, useState } from "react";

type UseAsyncConfirmOptions<T> = {
  onConfirm: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export type UseAsyncConfirmResult<T> = {
  isOpen: boolean;
  isPending: boolean;
  pendingData: T | null;
  trigger: (data: T) => void;
  confirm: () => void;
  cancel: () => void;
};

export function useAsyncConfirm<T>({
  onConfirm,
  onSuccess,
  onError,
}: UseAsyncConfirmOptions<T>): UseAsyncConfirmResult<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [pendingData, setPendingData] = useState<T | null>(null);

  // use ref to ensure latest handlers are used in confirm callback
  const handlers = useRef({ onConfirm, onSuccess, onError });
  useEffect(() => {
    handlers.current = { onConfirm, onSuccess, onError };
  }, [onConfirm, onSuccess, onError]);

  const trigger = useCallback((data: T) => {
    setPendingData(data);
    setIsOpen(true);
  }, []);

  const cancel = useCallback(() => {
    setIsOpen(false);
    setPendingData(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pendingData || isPending) {
      return;
    }

    setIsPending(true);
    try {
      await handlers.current.onConfirm(pendingData);
      setIsOpen(false);
      setPendingData(null);
      handlers.current.onSuccess?.();
    } catch (error) {
      handlers.current.onError?.(error as Error);
    } finally {
      setIsPending(false);
    }
  }, [pendingData, isPending]);

  return {
    isOpen,
    isPending,
    pendingData,
    trigger,
    confirm,
    cancel,
  };
}
