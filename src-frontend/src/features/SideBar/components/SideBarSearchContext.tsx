import {
  createContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SideBarSearchContextValue = {
  query: string;
  normalizedQuery: string | null;
  setQuery: (query: string) => void;
};

const SideBarSearchContext =
  createContext<SideBarSearchContextValue | null>(null);

type SideBarSearchProviderProps = {
  children: (value: SideBarSearchContextValue) => ReactNode;
};

export function SideBarSearchProvider({
  children,
}: SideBarSearchProviderProps) {
  const [query, setQuery] = useState("");

  const value = useMemo<SideBarSearchContextValue>(
    () => ({
      query,
      normalizedQuery: query.trim() || null,
      setQuery,
    }),
    [query],
  );

  return (
    <SideBarSearchContext.Provider value={value}>
      {children(value)}
    </SideBarSearchContext.Provider>
  );
}
