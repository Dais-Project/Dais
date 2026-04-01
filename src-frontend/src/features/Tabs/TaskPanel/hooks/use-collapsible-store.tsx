import { createContext, useContext, useRef } from "react";
import { StoreApi, useStore } from "zustand";
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
