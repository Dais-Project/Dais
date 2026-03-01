import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme } from "@/lib/apply-theme";
import { useSettingsStore } from "@/stores/settings-store";
import { Layout } from "./features/Layout";

function App() {
  const { current: { theme } } = useSettingsStore();
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <TooltipProvider>
      <Layout />
    </TooltipProvider>
  );
}

export default App;
