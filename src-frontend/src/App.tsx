import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme } from "@/lib/apply-theme";
import { useConfigStore } from "@/stores/config-store";
import { Layout } from "./features/Layout";

function App() {
  const { current: config } = useConfigStore();
  const { theme } = config;

  useEffect(() => applyTheme(theme), [theme]);

  return (
    <TooltipProvider>
      <Layout />
    </TooltipProvider>
  );
}

export default App;
