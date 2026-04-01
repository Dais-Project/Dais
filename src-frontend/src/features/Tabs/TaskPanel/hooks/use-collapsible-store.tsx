import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { StoreApi, useStore } from "zustand";
import { useMount } from "ahooks";
import { createCollapsibleStore, type CollapsibleStore } from "../stores/collapsible-store";

const CollapsibleStoreContext =
  createContext<StoreApi<CollapsibleStore> | null>(null);

export function CollapsibleStoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<ReturnType<typeof createCollapsibleStore>>(createCollapsibleStore());

  return (
    <CollapsibleStoreContext value={storeRef.current}>
      {children}
    </CollapsibleStoreContext>
  );
}

export function useCollapsibleStore<T>(
  selector: (state: CollapsibleStore) => T
): T {
  const store = useContext(CollapsibleStoreContext);

  if (!store) {
    throw new Error("useCollapsibleStore must be used within Provider");
  }

  return useStore(store, selector);
}

export function useCollapsed(
  id: string,
  defaultValue: boolean,
): [boolean, (collapsed: boolean) => void] {
  const collapsed = useCollapsibleStore((state) => state.collapsedMap[id]);
  const setCollapsed = useCollapsibleStore((state) => state.setCollapsed);

  useMount(() => {
    if (collapsed === undefined) {
      setCollapsed(id, defaultValue);
    }
  });

  const setCollapsedWrapper = useCallback((collapsed: boolean) => {
    setCollapsed(id, collapsed);
  }, [id, setCollapsed]);

  return useMemo(() => {
    return [collapsed ?? defaultValue, setCollapsedWrapper];
  }, [collapsed, defaultValue, setCollapsedWrapper]);
}
