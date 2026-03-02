import { Suspense, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme } from "@/lib/apply-theme";
import { useSettingsStore } from "@/stores/settings-store";
import { Layout, LayoutSkeleton } from "./features/Layout";

function App() {
  const { current: { theme } } = useSettingsStore();
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <TooltipProvider>
      <Suspense fallback={<LayoutSkeleton />}>
        <Layout />
      </Suspense>
    </TooltipProvider>
  );
}

export default App;
