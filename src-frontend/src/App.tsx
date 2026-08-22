import { Suspense, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalShortcutsProvider } from "@/hooks/use-global-shortcuts";
import { useDisableNativeContextMenu } from "@/hooks/use-disable-native-context-menu";
import { applyTheme } from "@/lib/apply-theme";
import sseDispatcher, { SSE_ENDPOINT } from "@/lib/sse-dispatcher";
import { useSettingsStore } from "@/stores/settings-store";
import { i18n, resolveLanguage } from "@/i18n";
import { Layout, LayoutSkeleton } from "@/features/Layouts";

function App() {
  useDisableNativeContextMenu();

  const { current: { theme, language } } = useSettingsStore();
  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    const nextLanguage = resolveLanguage(language);
    if (i18n.resolvedLanguage === nextLanguage) return;
    i18n.changeLanguage(nextLanguage);
  }, [language]);

  useEffect(() => {
    sseDispatcher.connect(SSE_ENDPOINT);
    return () => sseDispatcher.disconnect();
  }, []);

  return (
    <TooltipProvider>
      <Suspense fallback={<LayoutSkeleton />}>
        <GlobalShortcutsProvider>
          <Layout />
        </GlobalShortcutsProvider>
      </Suspense>
    </TooltipProvider>
  );
}

export default App;
