import { createContext, useContext } from "react";

type NavigationDrawerContextValue = {
  close: () => void;
};

const NavigationDrawerContext =
  createContext<NavigationDrawerContextValue | null>(null);

type NavigationDrawerProviderProps = {
  children: React.ReactNode;
  onClose: () => void;
};

export function NavigationDrawerProvider({
  children,
  onClose,
}: NavigationDrawerProviderProps) {
  return (
    <NavigationDrawerContext.Provider value={{ close: onClose }}>
      {children}
    </NavigationDrawerContext.Provider>
  );
}

export function useNavigationDrawer() {
  const context = useContext(NavigationDrawerContext);

  if (context === null) {
    throw new Error(
      "useNavigationDrawer must be used within NavigationDrawerProvider",
    );
  }

  return context;
}
