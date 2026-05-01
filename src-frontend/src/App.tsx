import { Suspense, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme } from "@/lib/apply-theme";
import { useSettingsStore } from "@/stores/settings-store";
import { i18n, resolveLanguage } from "./i18n";
import { Layout, LayoutSkeleton } from "./features/Layout";
import sseDispatcher, { SSE_ENDPOINT } from "./lib/sse-dispatcher";

function App() {
  const { current: { theme, language } } = useSettingsStore();
  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    const nextLanguage = resolveLanguage(language);
    if (i18n.resolvedLanguage === nextLanguage) {
      return;
    }

    i18n.changeLanguage(nextLanguage);
  }, [language]);

  useEffect(() => {
    sseDispatcher.connect(SSE_ENDPOINT);
    return () => sseDispatcher.disconnect();
  }, []);


  return (
    <TooltipProvider>
      <Suspense fallback={<LayoutSkeleton />}>
        <Layout />
      </Suspense>
    </TooltipProvider>
  );
}

export default App;
